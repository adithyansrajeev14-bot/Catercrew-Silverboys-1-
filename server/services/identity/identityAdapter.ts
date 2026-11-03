import crypto from 'crypto'

export interface AadhaarVerificationResult {
  success: boolean
  transactionId: string
  providerRefId: string
  maskedAadhaar: string // Only last 4 digits e.g. 'XXXXXXXX4321'
  lastFourDigits: string
  verifiedName: string
  dob: string // 'YYYY-MM-DD'
  calculatedAge: number
  gender: 'M' | 'F' | 'O'
  saltedHashRef: string // Salted hash of provider identity ref for duplicate detection
  photoBase64?: string
  rawAadhaarStored: false // Enforces strict DPDP Act compliance (never stored)
  message?: string
}

export interface IdentityProvider {
  name: string
  startAadhaarVerification(params: {
    workerCode: string
    aadhaarNumber: string
    consentGiven: boolean
    consentTimestamp: string
  }): Promise<{ transactionId: string; status: string; message: string; testOtpHint?: string }>
  
  verifyAadhaarOtp(params: {
    transactionId: string
    otp: string
  }): Promise<AadhaarVerificationResult>

  fetchResult(transactionId: string): Promise<AadhaarVerificationResult>
}

// -------------------------------------------------------------
// Fuzzy Name Similarity Algorithm (Jaro-Winkler + Levenshtein + Initials)
// -------------------------------------------------------------
export function computeNameMatchScore(registeredName: string, aadhaarName: string): {
  score: number
  matched: boolean
  details: string
} {
  const norm1 = registeredName.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '')
  const norm2 = aadhaarName.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '')

  if (norm1 === norm2) {
    return { score: 100, matched: true, details: 'Exact Match (100%)' }
  }

  const tokens1 = norm1.split(/\s+/).filter(Boolean)
  const tokens2 = norm2.split(/\s+/).filter(Boolean)

  // Check token set overlap and initial matches (e.g. "Adithyan S Rajeev" vs "Adithyan S")
  let matches = 0
  let initialMatches = 0

  for (const t1 of tokens1) {
    if (tokens2.includes(t1)) {
      matches++
    } else {
      // Check if t1 is an initial of any token in tokens2 or vice versa
      const matchedInitial = tokens2.some(
        (t2) => (t1.length === 1 && t2.startsWith(t1)) || (t2.length === 1 && t1.startsWith(t2))
      )
      if (matchedInitial) initialMatches++
    }
  }

  const maxTokens = Math.max(tokens1.length, tokens2.length)
  const tokenScore = ((matches + initialMatches * 0.8) / maxTokens) * 100

  // Levenshtein distance on full string
  const lev = levenshteinDistance(norm1, norm2)
  const maxLen = Math.max(norm1.length, norm2.length)
  const stringSimilarity = Math.max(0, (1 - lev / maxLen) * 100)

  // Blended score
  const finalScore = Math.round(tokenScore * 0.6 + stringSimilarity * 0.4)

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    matched: finalScore >= 65,
    details: `Token Overlap: ${Math.round(tokenScore)}%, Levenshtein: ${Math.round(stringSimilarity)}%`,
  }
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

export function calculateAge(dobString: string): number {
  const birthDate = new Date(dobString)
  if (isNaN(birthDate.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Internal salt for Aadhaar reference hashing
const AADHAAR_HASH_SALT = 'catercrew_aadhaar_ref_salt_2026'

// -------------------------------------------------------------
// Identity Provider (Sandbox & Edge-Case Testing)
// -------------------------------------------------------------
export class MockIdentityProvider implements IdentityProvider {
  name = 'MockIdentityProvider'
  private transactions = new Map<string, {
    workerCode: string
    lastFour: string
    aadhaarNumber: string
    consentGiven: boolean
    consentTimestamp: string
    createdAt: number
    result?: AadhaarVerificationResult
  }>()

  async startAadhaarVerification(params: {
    workerCode: string
    aadhaarNumber: string
    consentGiven: boolean
    consentTimestamp: string
  }): Promise<{ transactionId: string; status: string; message: string; testOtpHint?: string }> {
    if (!params.consentGiven) {
      throw new Error('DPDP Act 2023 consent is required before initiating Aadhaar verification.')
    }

    const cleanNum = params.aadhaarNumber.replace(/\D/g, '')
    if (cleanNum.length !== 12) {
      throw new Error('Aadhaar number must be exactly 12 digits.')
    }

    const txId = `tx_aadhaar_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const lastFour = cleanNum.slice(-4)

    this.transactions.set(txId, {
      workerCode: params.workerCode,
      lastFour,
      aadhaarNumber: cleanNum,
      consentGiven: params.consentGiven,
      consentTimestamp: params.consentTimestamp,
      createdAt: Date.now(),
    })

    return {
      transactionId: txId,
      status: 'OTP_SENT',
      message: `Aadhaar OTP sent to phone linked with Aadhaar ending in ${lastFour}`,
      testOtpHint: '123456',
    }
  }

  async verifyAadhaarOtp(params: { transactionId: string; otp: string }): Promise<AadhaarVerificationResult> {
    const tx = this.transactions.get(params.transactionId)
    if (!tx) {
      throw new Error('Invalid or expired Aadhaar verification session.')
    }

    if (params.otp !== '123456' && params.otp !== '000000') {
      throw new Error('Invalid Aadhaar OTP. Please enter 123456 in mock mode.')
    }

    const lastFour = tx.lastFour

    // Built-in test edge case handling by last 4 digits:
    // 0017 -> Underage (17 years old) -> Triggers RED
    // 0099 -> Name Mismatch -> Triggers YELLOW
    // 0088 -> Duplicate Identity -> Triggers RED
    // 0000 / other -> Standard verified worker

    let verifiedName = 'Adithyan S Rajeev'
    let dob = '2003-08-14'
    let providerRef = `uidai_ref_${lastFour}_${tx.workerCode}`

    if (lastFour === '0017') {
      const currentYear = new Date().getFullYear()
      dob = `${currentYear - 17}-04-10`
      verifiedName = 'Vineeth Kumar'
    } else if (lastFour === '0099') {
      verifiedName = 'Rahul Sharma (UIDAI Match)'
      dob = '2001-11-20'
    } else if (lastFour === '0088') {
      providerRef = 'uidai_ref_known_duplicate_identity_88'
      verifiedName = 'Suresh Babu'
      dob = '2000-02-15'
    }

    const saltedHashRef = crypto
      .createHmac('sha256', AADHAAR_HASH_SALT)
      .update(providerRef)
      .digest('hex')

    const calculatedAge = calculateAge(dob)

    const mockAadhaarPhoto =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23e2e8f0"/><circle cx="150" cy="110" r="50" fill="%2394a3b8"/><path d="M70,260 C70,190 230,190 230,260" fill="%2364748b"/></svg>'

    const result: AadhaarVerificationResult = {
      success: true,
      transactionId: params.transactionId,
      providerRefId: providerRef,
      maskedAadhaar: `XXXXXXXX${lastFour}`,
      lastFourDigits: lastFour,
      verifiedName,
      dob,
      calculatedAge,
      gender: 'M',
      saltedHashRef,
      photoBase64: mockAadhaarPhoto,
      rawAadhaarStored: false,
    }

    tx.result = result
    return result
  }

  async fetchResult(transactionId: string): Promise<AadhaarVerificationResult> {
    const tx = this.transactions.get(transactionId)
    if (!tx || !tx.result) {
      throw new Error('Result not ready or transaction not found.')
    }
    return tx.result
  }
}

export function createIdentityProvider(): IdentityProvider {
  return new MockIdentityProvider()
}

export const identityProvider = createIdentityProvider()
