import { useOnboarding } from '../../context/OnboardingContext'
import { REGIONS } from '../../data/regions'
import OptionButton from '../OptionButton'

/** step2 — 시·도 선택 완료 여부 */
export function isStep2Complete(region: string): boolean {
  return REGIONS.includes(region as (typeof REGIONS)[number])
}

/** step2 — 시·도 2열 grid 선택 */
export default function Step2Region() {
  const { profile, setField } = useOnboarding()

  const handleSelect = (region: string) => {
    setField('region', region)
    if (profile.region !== region) {
      setField('district', '')
    }
  }

  return (
    <div className="options-grid">
      {REGIONS.map((region) => (
        <OptionButton
          key={region}
          label={region}
          selected={profile.region === region}
          onClick={() => handleSelect(region)}
        />
      ))}
    </div>
  )
}
