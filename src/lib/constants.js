export const KERALA_DISTRICTS = [
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad',
]

export const TIERS = {
  silver: {
    label: 'Silver Boy',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    color: '#059669',
    prefix: 'SLV',
  },
  golden: {
    label: 'Golden Boy',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    color: '#d97706',
    prefix: 'GLD',
  },
  diamond: {
    label: 'Diamond Boy',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    color: '#0284c7',
    prefix: 'DMD',
  },
}

export const STATUS_CONFIG = {
  pending: {
    label: 'Pending Verification',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeSolid: 'bg-emerald-600 text-white',
    description: 'Your registration is submitted and waiting for administrator review.',
  },
  verified: {
    label: 'Verified',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    badgeSolid: 'bg-emerald-600 text-white',
    description: 'This profile and credentials have been officially verified by CaterCrew.',
  },
  suspended: {
    label: 'Suspended',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    badgeSolid: 'bg-rose-600 text-white',
    description: 'This profile is currently suspended and inactive.',
  },
}

export const MAX_PHOTO_SIZE_MB = 3
