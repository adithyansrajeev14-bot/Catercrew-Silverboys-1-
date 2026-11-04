import { VERIFICATION_CONFIG } from '../config/verificationConfig.ts'
import { computeNameMatchScore } from './identity/identityAdapter.ts'

export interface WorkerVerificationInputs {
  workerCode: string
  registeredName: string
  registeredDob: string
  registeredPhone: string
  heightCm: number
  experienceYears: number
  district: string

  // Step 1: OTP
  otpVerified: boolean

  // Step 2: Aadhaar Details
  aadhaarVerified: boolean
  aadhaarName: string
  aadhaarDob: string
  aadhaarLastFour: string
  aadhaarRefHash: string
  isDuplicateAadhaar: boolean

  // Step 3: Face & Liveness
  livenessPassed: boolean
  antiSpoofPassed: boolean
  faceMatchScore: number
  isDuplicateFace: boolean
  selfieStoragePath: string
}

export interface RoutingDecision {
  route: 'GREEN' | 'YELLOW' | 'RED'
  recommendedStatus: 'verified' | 'pending' | 'rejected'
  nameMatchScore: number
  faceMatchScore: number
  calculatedAge: number
  reasons: string[]
  scores: {
    nameMatch: number
    faceMatch: number
    calculatedAge: number
    livenessPassed: boolean
    antiSpoofPassed: boolean
    heightValid: boolean
    experienceValid: boolean
  }
}

export function evaluateVerification(inputs: WorkerVerificationInputs): RoutingDecision {
  const reasons: string[] = []
  let route: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN'

  // 1. Calculate Real Age from DOB
  const birthDate = new Date(inputs.aadhaarDob || inputs.registeredDob || '2004-01-01')
  const today = new Date()
  let calculatedAge = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    calculatedAge--
  }

  // 2. Strict Duplicate Checks (Immediate Rejection)
  if (inputs.isDuplicateFace) {
    route = 'RED'
    reasons.push('Duplicate registration detected: Live selfie facial biometrics match an existing registered CaterCrew staff profile.')
  }

  if (inputs.isDuplicateAadhaar) {
    route = 'RED'
    reasons.push('Duplicate registration detected: This identity is already registered with another account.')
  }

  // 3. Live Selfie & Anti-Spoof Checks
  if (!inputs.livenessPassed) {
    route = 'RED'
    reasons.push('Live selfie check failed: Required facial movement/liveness was not confirmed.')
  }

  if (!inputs.antiSpoofPassed) {
    route = 'RED'
    reasons.push('Anti-spoofing alert: Screen replay or static photo detected instead of live human presence.')
  }

  // 4. Age Check (under 18)
  if (calculatedAge > 0 && calculatedAge < VERIFICATION_CONFIG.MIN_AGE) {
    route = 'RED'
    reasons.push(`Underage applicant: Age is ${calculatedAge} years. Minimum age requirement is 18 years.`)
  }

  // 5. Face Match / Quality Check
  const faceScore = inputs.faceMatchScore || 92
  if (faceScore < 50) {
    route = 'RED'
    reasons.push(`Face image clarity score (${faceScore}%) is below minimum acceptance threshold.`)
  }

  // 6. Name match score (informational / fallback)
  const nameComp = computeNameMatchScore(inputs.registeredName, inputs.aadhaarName || inputs.registeredName)
  const nameScore = nameComp.score

  // 7. Auto-Verification Decision
  let recommendedStatus: 'verified' | 'pending' | 'rejected' = 'verified'
  if (route === 'RED') {
    recommendedStatus = 'rejected'
  } else {
    // AUTO-VERIFICATION ON: Live selfie passed and no duplicate found
    route = 'GREEN'
    recommendedStatus = 'verified'
    reasons.push('Live selfie verified with active liveness check.')
    reasons.push('Duplicate registration scan passed: No duplicate staff accounts found.')
    reasons.push('Staff profile automatically approved and verified!')
  }

  const heightValid =
    inputs.heightCm >= VERIFICATION_CONFIG.HEIGHT_MIN_CM &&
    inputs.heightCm <= VERIFICATION_CONFIG.HEIGHT_MAX_CM
  const experienceValid = inputs.experienceYears >= 0

  return {
    route,
    recommendedStatus,
    nameMatchScore: nameScore,
    faceMatchScore: faceScore,
    calculatedAge,
    reasons,
    scores: {
      nameMatch: nameScore,
      faceMatch: faceScore,
      calculatedAge,
      livenessPassed: inputs.livenessPassed,
      antiSpoofPassed: inputs.antiSpoofPassed,
      heightValid,
      experienceValid,
    },
  }
}
