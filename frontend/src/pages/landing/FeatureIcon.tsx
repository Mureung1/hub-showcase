import type { FeatureIconName } from './landingData'

interface FeatureIconProps {
  icon: FeatureIconName
}

export function FeatureIcon({ icon }: FeatureIconProps) {
  if (icon === 'bell') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 10a6 6 0 0 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
        <path d="M9.5 20a3 3 0 0 0 5 0" />
      </svg>
    )
  }

  if (icon === 'hash') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9h16" />
        <path d="M4 15h16" />
        <path d="M10 3 8 21" />
        <path d="m16 3-2 18" />
      </svg>
    )
  }

  if (icon === 'search') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m16.2 16.2 4.3 4.3" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14 4-4 16" />
    </svg>
  )
}
