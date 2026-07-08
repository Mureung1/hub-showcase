import { useState, type FormEvent } from 'react'
import type { Profile } from '../types'
import './OnboardingForm.css'

interface OnboardingFormProps {
  onComplete: (profile: Profile) => void
  initialProfile?: Profile | null
}

const industries = ['요식업', '소매업', '서비스업', '기타']

function OnboardingForm({ onComplete, initialProfile }: OnboardingFormProps) {
  const [industry, setIndustry] = useState(initialProfile?.industry ?? industries[0])
  const [isCorporation, setIsCorporation] = useState(initialProfile?.isCorporation ?? false)
  const [hasEmployee, setHasEmployee] = useState(initialProfile?.hasEmployee ?? false)
  const [isRented, setIsRented] = useState(initialProfile?.isRented ?? false)
  const [closureDate, setClosureDate] = useState(initialProfile?.closureDate ?? '')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!closureDate) return
    onComplete({ industry, isCorporation, hasEmployee, isRented, closureDate })
  }

  return (
    <main className="onboarding">
      <h1>내 상황을 알려주세요</h1>
      <p className="onboarding__lead">
        답변에 맞는 폐업 절차·세무 일정·지원금만 추려서 보여드려요.
      </p>

      <form className="onboarding__form" onSubmit={handleSubmit}>
        <label className="onboarding__field">
          <span>업종</span>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
            {industries.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="onboarding__field">
          <legend>사업자 유형</legend>
          <label>
            <input
              type="radio"
              name="isCorporation"
              checked={!isCorporation}
              onChange={() => setIsCorporation(false)}
            />
            개인사업자
          </label>
          <label>
            <input
              type="radio"
              name="isCorporation"
              checked={isCorporation}
              onChange={() => setIsCorporation(true)}
            />
            법인
          </label>
        </fieldset>

        <label className="onboarding__field onboarding__field--checkbox">
          <input
            type="checkbox"
            checked={hasEmployee}
            onChange={(e) => setHasEmployee(e.target.checked)}
          />
          직원이 있어요
        </label>

        <label className="onboarding__field onboarding__field--checkbox">
          <input
            type="checkbox"
            checked={isRented}
            onChange={(e) => setIsRented(e.target.checked)}
          />
          임대 사업장이에요
        </label>

        <label className="onboarding__field">
          <span>폐업 예정일</span>
          <input
            type="date"
            value={closureDate}
            onChange={(e) => setClosureDate(e.target.value)}
            required
          />
        </label>

        <button type="submit" className="onboarding__submit">
          {initialProfile ? '조건 저장하고 돌아가기' : '맞춤 체크리스트 보기'}
        </button>
      </form>
    </main>
  )
}

export default OnboardingForm
