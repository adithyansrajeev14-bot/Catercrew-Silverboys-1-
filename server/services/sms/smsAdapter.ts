import crypto from 'crypto'
import { VERIFICATION_CONFIG } from '../../config/verificationConfig.ts'

export interface SmsProvider {
  name: string
  sendOtp(phone: string, otp: string, workerName?: string): Promise<{ success: boolean; messageId: string }>
}

// Mock SMS Provider (Development & Direct Sandbox)
export class MockSmsProvider implements SmsProvider {
  name = 'MockSmsProvider'

  async sendOtp(phone: string, _otp: string, _workerName?: string): Promise<{ success: boolean; messageId: string }> {
    return {
      success: true,
      messageId: `mock_sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    }
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

// Cryptographic salt for OTP HMAC hashing (no external env var required)
const OTP_HASH_SECRET = 'catercrew_secure_otp_internal_key_2026'

class OtpManager {
  private store = new Map<string, OtpRecord>()
  private ipRateLimits = new Map<string, number[]>()
  private provider: SmsProvider

  constructor() {
    this.provider = new MockSmsProvider()
  }

  public getProviderName(): string {
    return this.provider.name
  }

  private hashOtp(otp: string, salt: string): string {
    return crypto.createHmac('sha256', OTP_HASH_SECRET).update(`${otp}:${salt}`).digest('hex')
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

    // Provide friendly hint for sandbox testing
    return {
      success: true,
      message: 'OTP sent successfully to registered phone.',
      testOtpHint: rawOtp,
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

    // Universal test code "123456" for sandbox testing
    const isUniversalDevCode = submittedOtp.trim() === '123456'

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
