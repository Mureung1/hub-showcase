import { useOnboarding } from '../../context/OnboardingContext'
import { getDistricts } from '../../data/regions'
import OptionButton from '../OptionButton'

/** step3 — 구·군 선택 완료 여부 */
export function isStep3Complete(region: string, district: string): boolean {
  if (!district.trim()) return false
  return getDistricts(region).includes(district)
}

/** step3 — 시·도 연동 구·군 2열 grid 선택 */
export default function Step3District() {
  const { profile, setField } = useOnboarding()
  const districts = getDistricts(profile.region)

  return (
    <div className="options-grid">
      {districts.map((district) => (
        <OptionButton
          key={district}
          label={district}
          selected={profile.district === district}
          onClick={() => setField('district', district)}
        />
      ))}
    </div>
  )
}
