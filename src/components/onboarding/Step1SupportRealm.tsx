import { useOnboarding } from '../../context/OnboardingContext'
import { SUPPORT_REALM_OPTIONS } from '../../data/onboardingSteps'
import OptionButton from '../OptionButton'

/** step1 — 지원분야 선택 완료 여부 (하나 이상 선택 필요) */
export function isStep1Complete(supportRealm: string[]): boolean {
  return supportRealm.length > 0
}

/** step1 — 지원분야 복수선택 (이슈 #91/#92, 예전 업종 단일선택을 대체) */
export default function Step1SupportRealm() {
  const { profile, setField } = useOnboarding()

  const toggle = (value: string) => {
    const next = profile.supportRealm.includes(value)
      ? profile.supportRealm.filter((v) => v !== value)
      : [...profile.supportRealm, value]
    setField('supportRealm', next)
  }

  return (
    <div className="options">
      {SUPPORT_REALM_OPTIONS.map((opt) => (
        <OptionButton
          key={opt.value}
          label={opt.label}
          icon={opt.icon}
          selected={profile.supportRealm.includes(opt.value)}
          onClick={() => toggle(opt.value)}
        />
      ))}
    </div>
  )
}
