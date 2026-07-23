type IconProps = {
  className?: string
}

const BASE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE_PROPS}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  )
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE_PROPS}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE_PROPS}>
      <rect height="15" rx="2" width="16" x="4" y="5.5" />
      <path d="M4 10h16" />
      <path d="M8 3.5v3M16 3.5v3" />
    </svg>
  )
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE_PROPS}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="10" r="2.3" />
      <path d="M15.5 14.2c2.2.3 3.8 1.9 4 4.3" />
    </svg>
  )
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE_PROPS}>
      <path d="M4 6h10M18 6h2" />
      <circle cx="16" cy="6" r="2" />
      <path d="M4 12h4M12 12h8" />
      <circle cx="8" cy="12" r="2" />
      <path d="M4 18h10M18 18h2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  )
}
