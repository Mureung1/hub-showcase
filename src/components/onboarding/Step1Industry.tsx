import { useRef, useState } from 'react'
import { useOnboarding } from '../../context/OnboardingContext'
import { INDUSTRY_OPTIONS } from '../../data/onboardingSteps'
import OptionButton from '../OptionButton'

const PREDEFINED_VALUES = new Set(
  INDUSTRY_OPTIONS.filter((o) => o.value !== '기타').map((o) => o.value),
)

function isPredefinedIndustry(value: string): boolean {
  return PREDEFINED_VALUES.has(value)
}

/** step1 — 업종 선택 완료 여부 (기타는 직접 입력 필수) */
export function isStep1Complete(industry: string): boolean {
  return industry.trim().length > 0
}

/** step1 — 업종 선택 + 기타 직접입력 */
export default function Step1Industry() {
  const { profile, setField } = useOnboarding()
  const inputRef = useRef<HTMLInputElement>(null)

  const initialCustom =
    profile.industry !== '' && !isPredefinedIndustry(profile.industry)

  const [showCustom, setShowCustom] = useState(initialCustom)
  const [customText, setCustomText] = useState(initialCustom ? profile.industry : '')

  const selectedValue = showCustom ? '기타' : profile.industry

  const handleSelect = (value: string) => {
    if (value === '기타') {
      setShowCustom(true)
      setField('industry', customText.trim())
      inputRef.current?.focus()
      return
    }

    setShowCustom(false)
    setCustomText('')
    setField('industry', value)
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomText(val)
    setField('industry', val.trim())
  }

  return (
    <>
      <div className="options">
        {INDUSTRY_OPTIONS.map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            icon={opt.icon}
            selected={selectedValue === opt.value}
            onClick={() => handleSelect(opt.value)}
          />
        ))}
      </div>
      <div className={`custom-input-wrap${showCustom ? ' show' : ''}`}>
        <input
          ref={inputRef}
          className="custom-input"
          type="text"
          placeholder="업종을 직접 입력해주세요"
          value={customText}
          onChange={handleCustomChange}
        />
      </div>
    </>
  )
}
