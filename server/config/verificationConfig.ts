// CaterCrew Automated Verification Engine Configuration
// Single source of truth for all thresholds, rules, and timeouts

export const VERIFICATION_CONFIG = {
  // Face Match Thresholds (0 - 100)
  FACE_MATCH_PASS: 85,       // >= 85: Auto-pass (GREEN)
  FACE_MATCH_REVIEW: 65,     // 65 - 84: Manual Admin Review (YELLOW), < 65: Auto-reject (RED)

  // Fuzzy Name Match Thresholds (0 - 100)
  NAME_MATCH_PASS: 80,       // >= 80: High confidence pass
  NAME_MATCH_REVIEW: 65,     // 65 - 79: Tolerates spelling variations/initials (YELLOW)

  // Age & Demographic Rules
  MIN_AGE: 18,               // UIDAI DOB calculated age must be >= 18 (Strict RED if < 18)
  
  // Physical & Experience Validation
  HEIGHT_MIN_CM: 140,        // 140 cm minimum
  HEIGHT_MAX_CM: 210,        // 210 cm maximum
  // Experience rule: Experience years cannot exceed (Age - 16)
  MIN_WORK_START_AGE: 16,

  // Served Areas (Kerala Districts)
  SERVED_DISTRICTS: [
    'Thiruvananthapuram',
    'Kollam',
    'Pathanamthitta',
    'Alappuzha',
    'Kottayam',
    'Idukki',
    'Ernakulam',
    'Thrissur',
    'Palakkad',
    'Malappuram',
    'Kozhikode',
    'Wayanad',
    'Kannur',
    'Kasaragod',
  ],

  // Step 1: Phone OTP Rules
  OTP: {
    LENGTH: 6,
    EXPIRY_MS: 5 * 60 * 1000,          // 5 minutes
    MAX_RESEND_ATTEMPTS: 3,           // Max 3 resend attempts
    MAX_VERIFY_ATTEMPTS: 5,           // Max 5 wrong attempts
    LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes lockout
    RATE_LIMIT_PER_IP_MIN: 10,        // Max 10 OTP requests per minute per IP
  },

  // Storage & Privacy
  SELFIE_DATA_RETENTION_DAYS: 30,     // Retain face frames for 30 days, keep results permanently
  DPDP_CONSENT_NOTICE_VERSION: 'DPDP-2023-V1.2',
}
