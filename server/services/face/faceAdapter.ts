import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { VERIFICATION_CONFIG } from '../../config/verificationConfig.ts'

export interface FaceMatchResult {
  matchScore: number // 0 to 100
  confidence: number // 0 to 1
  livenessPassed: boolean
  antiSpoofPassed: boolean
  faceEmbeddingHash: string // For duplicate face detection across workers
  selfieStoragePath: string // Private server/storage path
  signedSelfieUrl: string // Short-lived signed URL or tokenized preview
  details: string
  recommendation: 'PASS' | 'REVIEW' | 'FAIL'
}

export interface FaceProvider {
  name: string
  matchFaces(params: {
    workerCode: string
    selfieBase64: string
    aadhaarPhotoBase64?: string
    livenessPassed: boolean
    antiSpoofPassed: boolean
    testScoreOverride?: number
  }): Promise<FaceMatchResult>
}

// In-memory or on-disk private storage directory for selfies (DPDP compliant)
const PRIVATE_STORAGE_DIR = path.resolve(process.cwd(), '.private_storage/selfies')
if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
  fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true })
}

// Store face hashes to prevent duplicate accounts with the same face
const REGISTERED_FACE_HASHES = new Map<string, string>() // faceHash -> workerCode

// -------------------------------------------------------------
// Face Provider (Biometrics & Movement Verification)
// -------------------------------------------------------------
export class MockFaceProvider implements FaceProvider {
  name = 'MockFaceProvider'

  async matchFaces(params: {
    workerCode: string
    selfieBase64: string
    aadhaarPhotoBase64?: string
    livenessPassed: boolean
    antiSpoofPassed: boolean
    testScoreOverride?: number
  }): Promise<FaceMatchResult> {
    const { workerCode, selfieBase64, livenessPassed, antiSpoofPassed, testScoreOverride } = params

    // 1. Verify Liveness and Anti-Spoof
    if (!livenessPassed) {
      return {
        matchScore: 0,
        confidence: 0,
        livenessPassed: false,
        antiSpoofPassed: false,
        faceEmbeddingHash: '',
        selfieStoragePath: '',
        signedSelfieUrl: '',
        details: 'Active liveness challenge failed: required gestures not performed in sequence.',
        recommendation: 'FAIL',
      }
    }

    if (!antiSpoofPassed) {
      return {
        matchScore: 20,
        confidence: 0.2,
        livenessPassed: true,
        antiSpoofPassed: false,
        faceEmbeddingHash: '',
        selfieStoragePath: '',
        signedSelfieUrl: '',
        details: 'Anti-spoof check triggered: possible printed photograph or screen replay detected.',
        recommendation: 'FAIL',
      }
    }

    // 2. Save selfie to private local storage (no public URL)
    const fileName = `${workerCode}_${Date.now()}.jpg`
    const filePath = path.join(PRIVATE_STORAGE_DIR, fileName)
    
    // Clean base64 data
    const cleanBase64 = selfieBase64.replace(/^data:image\/\w+;base64,/, '')
    try {
      fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'))
    } catch {
      // In constrained environments, fallback gracefully
    }

    // Generate secure facial feature fingerprint (simulated face embedding hash)
    const faceEmbeddingHash = crypto
      .createHash('sha256')
      .update(cleanBase64.slice(0, 1000))
      .digest('hex')

    // Check duplicate face detection
    const existingWorker = REGISTERED_FACE_HASHES.get(faceEmbeddingHash)
    if (existingWorker && existingWorker !== workerCode) {
      return {
        matchScore: 95,
        confidence: 0.95,
        livenessPassed: true,
        antiSpoofPassed: true,
        faceEmbeddingHash,
        selfieStoragePath: filePath,
        signedSelfieUrl: `/api/verify/selfie-secure/${fileName}?token=${Date.now()}`,
        details: `Duplicate face detected! Matches existing registered staff ID: ${existingWorker}.`,
        recommendation: 'FAIL',
      }
    }

    // Register this face
    REGISTERED_FACE_HASHES.set(faceEmbeddingHash, workerCode)

    // 3. Compute Match Score
    // Allow explicit testScoreOverride or generate realistic high match (89 - 96%)
    let score = testScoreOverride ?? (Math.floor(Math.random() * 8) + 89)

    // Allow test codes like workerCode ending in 'FAIL' or 'YELLOW'
    if (workerCode.endsWith('FAIL')) score = 52
    if (workerCode.endsWith('YELLOW') || workerCode.endsWith('REVIEW')) score = 76

    let recommendation: 'PASS' | 'REVIEW' | 'FAIL' = 'PASS'
    if (score >= VERIFICATION_CONFIG.FACE_MATCH_PASS) {
      recommendation = 'PASS'
    } else if (score >= VERIFICATION_CONFIG.FACE_MATCH_REVIEW) {
      recommendation = 'REVIEW'
    } else {
      recommendation = 'FAIL'
    }

    // Generate short-lived signed access URL for admin preview
    const signedSelfieUrl = `/api/verify/selfie-secure/${fileName}?token=${Buffer.from(`${workerCode}:${Date.now()}`).toString('base64url')}`

    return {
      matchScore: score,
      confidence: score / 100,
      livenessPassed: true,
      antiSpoofPassed: true,
      faceEmbeddingHash,
      selfieStoragePath: filePath,
      signedSelfieUrl,
      details: `Facial geometry match score: ${score}%. Recommendation: ${recommendation}`,
      recommendation,
    }
  }
}

export function createFaceProvider(): FaceProvider {
  return new MockFaceProvider()
}

export const faceProvider = createFaceProvider()
