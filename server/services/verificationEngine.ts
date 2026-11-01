import { VERIFICATION_CONFIG } from '../config/verificationConfig'
import { computeNameMatchScore } from './identity/identityAdapter'

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

  // 1. Calculate Real Age from Aadhaar DOB
  const birthDate = new Date(inputs.aadhaarDob || inputs.registeredDob)
  const today = new Date()
  let calculatedAge = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    calculatedAge--
  }

  // 2. Strict Red Flags (Immediate Rejection)
  if (!inputs.otpVerified) {
    route = 'RED'
    reasons.push('Phone OTP verification was not completed or failed.')
  }

  if (!inputs.aadhaarVerified) {
    route = 'RED'
    reasons.push('UIDAI / DigiLocker Aadhaar verification failed or incomplete.')
  }

  if (calculatedAge < VERIFICATION_CONFIG.MIN_AGE) {
    route = 'RED'
    reasons.push(`Underage applicant: age is ${calculatedAge} years. Minimum age requirement is 18 years.`)
  }

  if (inputs.isDuplicateAadhaar) {
    route = 'RED'
    reasons.push('Duplicate Aadhaar identity: this identity is already registered with another account.')
  }

  if (inputs.isDuplicateFace) {
    route = 'RED'
    reasons.push('Duplicate face detection: facial biometrics match another existing staff profile.')
  }

  if (!inputs.livenessPassed) {
    route = 'RED'
    reasons.push('Active liveness check failed: required facial gestures were not detected.')
  }

  if (!inputs.antiSpoofPassed) {
    route = 'RED'
    reasons.push('Anti-spoofing alert: detected high probability of printed photo or screen replay.')
  }

  // 3. Name Similarity Evaluation
  const nameComp = computeNameMatchScore(inputs.registeredName, inputs.aadhaarName)
  const nameScore = nameComp.score

  if (nameScore < VERIFICATION_CONFIG.NAME_MATCH_REVIEW) {
    route = 'RED'
    reasons.push(`Severe name mismatch (${nameScore}%): "${inputs.registeredName}" vs UIDAI "${inputs.aadhaarName}".`)
  } else if (nameScore < VERIFICATION_CONFIG.NAME_MATCH_PASS) {
    if (route !== 'RED') route = 'YELLOW'
    reasons.push(`Name similarity is borderline (${nameScore}%): "${inputs.registeredName}" vs UIDAI "${inputs.aadhaarName}". Admin check recommended.`)
  }

  // 4. Face Match Score Evaluation
  const faceScore = inputs.faceMatchScore
  if (faceScore < VERIFICATION_CONFIG.FACE_MATCH_REVIEW) {
    route = 'RED'
    reasons.push(`Face match score (${faceScore}%) is below minimum acceptance threshold (65%).`)
  } else if (faceScore < VERIFICATION_CONFIG.FACE_MATCH_PASS) {
    if (route !== 'RED') route = 'YELLOW'
    reasons.push(`Face match score is borderline (${faceScore}%). Requires manual visual inspection.`)
  }

  // 5. Physical & Experience Data Validation
  const heightValid =
    inputs.heightCm >= VERIFICATION_CONFIG.HEIGHT_MIN_CM &&
    inputs.heightCm <= VERIFICATION_CONFIG.HEIGHT_MAX_CM

  if (!heightValid) {
    if (route !== 'RED') route = 'YELLOW'
    reasons.push(`Height (${inputs.heightCm} cm) is outside standard expected range (140 - 210 cm).`)
  }

  const maxRealisticExp = Math.max(0, calculatedAge - VERIFICATION_CONFIG.MIN_WORK_START_AGE)
  const experienceValid = inputs.experienceYears <= maxRealisticExp

  if (!experienceValid) {
    if (route !== 'RED') route = 'YELLOW'
    reasons.push(
      `Claimed experience (${inputs.experienceYears} yrs) exceeds realistic working years for age ${calculatedAge} (max ${maxRealisticExp} yrs).`
    )
  }

  // District Validation
  const districtValid = VERIFICATION_CONFIG.SERVED_DISTRICTS.includes(inputs.district)
  if (!districtValid) {
    if (route !== 'RED') route = 'YELLOW'
    reasons.push(`District "${inputs.district}" is not in the primary served Kerala district list.`)
  }

  // 6. Final Status Assignment
  let recommendedStatus: 'verified' | 'pending' | 'rejected' = 'verified'
  if (route === 'RED') {
    recommendedStatus = 'rejected'
  } else if (route === 'YELLOW') {
    recommendedStatus = 'pending'
  } else {
    recommendedStatus = 'verified'
    reasons.push('All automated checks passed with high confidence. Auto-verified.')
  }

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
