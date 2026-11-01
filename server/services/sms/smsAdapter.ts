import crypto from 'crypto'
import { VERIFICATION_CONFIG } from '../../config/verificationConfig'

export interface SmsProvider {
  name: string
  sendOtp(phone: string, otp: string, workerName?: string): Promise<{ success: boolean; messageId: string }>
}

// 1. Mock SMS Provider (Development & Sandbox)
export class MockSmsProvider implements SmsProvider {
  name = 'MockSmsProvider'

  async sendOtp(phone: string, _otp: string, workerName?: string): Promise<{ success: boolean; messageId: string }> {
    // In mock mode, never print sensitive OTP in public stdout. Return simulated delivery.
    return {
      success: true,
      messageId: `mock_sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    }
  }
}

// 2. MSG91 Real Provider Skeleton (For Production)
// Plug in MSG91_AUTH_KEY and MSG91_TEMPLATE_ID in .env
export class Msg91SmsProvider implements SmsProvider {
  name = 'Msg91SmsProvider'
  private authKey: string
  private templateId: string

  constructor(authKey?: string, templateId?: string) {
    this.authKey = authKey || process.env.MSG91_AUTH_KEY || ''
    this.templateId = templateId || process.env.MSG91_TEMPLATE_ID || ''
  }

  async sendOtp(phone: string, otp: string, workerName = 'CaterCrew Worker'): Promise<{ success: boolean; messageId: string }> {
    if (!this.authKey || !this.templateId) {
      throw new Error('MSG91 credentials not configured. Please set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID.')
    }
    const cleanPhone = phone.replace(/\D/g, '')
    const url = `https://control.msg91.com/api/v5/otp?template_id=${this.templateId}&mobile=91${cleanPhone.slice(-10)}&authkey=${this.authKey}&otp=${otp}`
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workerName }),
    })
    const data = await res.json() as { type?: string; message?: string; request_id?: string }
    if (data.type === 'error') {
      throw new Error(data.message || 'MSG91 delivery failure')
    }
    return { success: true, messageId: data.request_id || `msg91_${Date.now()}` }
  }
}

// 3. Twilio Real Provider Skeleton (Alternative)
export class TwilioSmsProvider implements SmsProvider {
  name = 'TwilioSmsProvider'
  private accountSid: string
  private authToken: string
  private fromNumber: string

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN || ''
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || ''
  }

  async sendOtp(phone: string, otp: string): Promise<{ success: boolean; messageId: string }> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error('Twilio credentials not configured.')
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    const formatted = `+91${cleanPhone}`
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`
    const body = new URLSearchParams({
      To: formatted,
      From: this.fromNumber,
      Body: `Your CaterCrew verification code is ${otp}. Valid for 5 minutes. Do not share this with anyone.`,
    })

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    const data = await res.json() as { sid?: string; message?: string }
    if (!res.ok) {
      throw new Error(data.message || 'Twilio send failed')
    }
    return { success: true, messageId: data.sid || `twilio_${Date.now()}` }
  }
}

// -------------------------------------------------------------
// In-Memory Hashed OTP Storage & Rate Limiting System
// -------------------------------------------------------------
interface OtpRecord {
  hashedOtp: string
  salt: string
  createdAt: number
  expiresAt: number
  attempts: number
  resends: number
  lockedUntil?: number
}

const SALT_SECRET = process.env.OTP_SALT_SECRET || 'catercrew_secure_otp_salt_2026'

class OtpManager {
  private store = new Map<string, OtpRecord>()
  private ipRateLimits = new Map<string, number[]>()
  private provider: SmsProvider

  constructor() {
    // Default to MockSmsProvider unless real keys are present
    if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
      this.provider = new Msg91SmsProvider()
    } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.provider = new TwilioSmsProvider()
    } else {
      this.provider = new MockSmsProvider()
    }
  }

  public getProviderName(): string {
    return this.provider.name
  }

  private hashOtp(otp: string, salt: string): string {
    return crypto.createHmac('sha256', SALT_SECRET).update(`${otp}:${salt}`).digest('hex')
  }

  public checkIpRateLimit(ip: string): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const timestamps = (this.ipRateLimits.get(ip) || []).filter((t) => t > oneMinuteAgo)
    if (timestamps.length >= VERIFICATION_CONFIG.OTP.RATE_LIMIT_PER_IP_MIN) {
      return false
    }
    timestamps.push(now)
    this.ipRateLimits.set(ip, timestamps)
    return true
  }

  public async generateAndSend(phone: string, ip: string, workerName?: string): Promise<{ success: boolean; message: string; testOtpHint?: string }> {
    if (!this.checkIpRateLimit(ip)) {
      return { success: false, message: 'Too many requests from this IP. Please wait a minute.' }
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    const now = Date.now()
    const existing = this.store.get(cleanPhone)

    // Check if currently locked
    if (existing?.lockedUntil && now < existing.lockedUntil) {
      const remainingMinutes = Math.ceil((existing.lockedUntil - now) / 60000)
      return {
        success: false,
        message: `Too many wrong attempts. Phone locked for ${remainingMinutes} more minutes.`,
      }
    }

    // Check resend limit within current active window
    if (existing && now < existing.expiresAt && existing.resends >= VERIFICATION_CONFIG.OTP.MAX_RESEND_ATTEMPTS) {
      return {
        success: false,
        message: 'Maximum resend limit reached. Please wait for the current code to expire before requesting again.',
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString()
    const salt = crypto.randomBytes(16).toString('hex')
    const hashed = this.hashOtp(rawOtp, salt)

    const record: OtpRecord = {
      hashedOtp: hashed,
      salt,
      createdAt: now,
      expiresAt: now + VERIFICATION_CONFIG.OTP.EXPIRY_MS,
      attempts: 0,
      resends: existing ? existing.resends + 1 : 0,
    }

    this.store.set(cleanPhone, record)

    // Dispatch via Provider
    await this.provider.sendOtp(cleanPhone, rawOtp, workerName)

    // In Mock mode, provide a friendly hint for developer sandbox testing
    const isMock = this.provider instanceof MockSmsProvider
    return {
      success: true,
      message: 'OTP sent successfully to registered phone.',
      testOtpHint: isMock ? rawOtp : undefined,
    }
  }

  public verify(phone: string, submittedOtp: string): { success: boolean; message: string; expired?: boolean; locked?: boolean } {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    const now = Date.now()
    const record = this.store.get(cleanPhone)

    if (!record) {
      return { success: false, message: 'No active OTP found. Please request a new code.' }
    }

    // Check lockout
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingMin = Math.ceil((record.lockedUntil - now) / 60000)
      return {
        success: false,
        locked: true,
        message: `Account temporarily locked due to repeated wrong attempts. Try again in ${remainingMin} minutes.`,
      }
    }

    // Check expiry
    if (now > record.expiresAt) {
      this.store.delete(cleanPhone)
      return { success: false, expired: true, message: 'OTP has expired. Please request a new code.' }
    }

    // Check OTP match (constant-time comparison)
    const candidateHash = this.hashOtp(submittedOtp.trim(), record.salt)
    const isMatch = crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(record.hashedOtp))

    // Fallback: in mock development, allow "123456" as universal test bypass code
    const isUniversalDevCode = this.provider instanceof MockSmsProvider && submittedOtp.trim() === '123456'

    if (isMatch || isUniversalDevCode) {
      // Consume OTP on success
      this.store.delete(cleanPhone)
      return { success: true, message: 'Phone number verified successfully.' }
    }

    // Increment failed attempts
    record.attempts += 1
    const attemptsLeft = VERIFICATION_CONFIG.OTP.MAX_VERIFY_ATTEMPTS - record.attempts

    if (attemptsLeft <= 0) {
      record.lockedUntil = now + VERIFICATION_CONFIG.OTP.LOCKOUT_DURATION_MS
      return {
        success: false,
        locked: true,
        message: 'Max wrong tries exceeded. Phone verification locked for 30 minutes.',
      }
    }

    return {
      success: false,
      message: `Incorrect OTP. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining.`,
    }
  }
}

export const otpManager = new OtpManager()
