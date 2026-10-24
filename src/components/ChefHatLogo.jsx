export function ChefHatIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Crown lobes with base band */}
      <path
        d="M17 20.5a1 1 0 0 0 1-1v-5.35c0-.46.32-.85.73-1.05a4 4 0 0 0-2.14-7.59 5 5 0 0 0-9.18 0 4 4 0 0 0-2.14 7.59c.41.2.73.59.73 1.05v5.35a1 1 0 0 0 1 1h10z"
        fill="currentColor"
      />
      {/* Headband separation crease */}
      <path
        d="M6.5 17h11"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BrandWithChefHat({
  size = 'text-6xl sm:text-8xl',
  dark = false,
  showTagline = false,
  taglineSize = 'text-base sm:text-lg',
  className = '',
}) {
  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className={`inline-flex items-baseline font-black tracking-tight leading-none ${size} select-none`}>
        <span className={`relative inline-block ${dark ? 'text-white' : 'text-gray-900'}`}>
          {/* Chef Hat resting on top-left curve of C */}
          <span
            className="absolute -top-[0.52em] -left-[0.24em] -rotate-[18deg] text-emerald-600 drop-shadow-sm pointer-events-none"
            aria-hidden="true"
          >
            <ChefHatIcon className="w-[0.62em] h-[0.62em]" />
          </span>
          C
        </span>
        <span className={dark ? 'text-white' : 'text-gray-900'}>ater</span>
        <span className="text-emerald-600 ml-0.5 sm:ml-1">Crew</span>
      </div>

      {showTagline && (
        <span className={`text-emerald-600 font-bold tracking-wider uppercase mt-2 ${taglineSize}`}>
          Earn it.
        </span>
      )}
    </div>
  )
}
