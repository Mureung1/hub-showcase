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
      <header className="onboarding__topbar">
        <span className="onboarding__brand">소상공인 폐업 도우미</span>
        <span className="onboarding__duration">약 1분 소요</span>
      </header>

      <div className="onboarding__content">
        <span className="onboarding__badge">1분 진단</span>
        <h1>내 상황을 알려주세요</h1>
        <p className="onboarding__lead">
          답변에 맞는 폐업 절차·세무 일정·지원금만 추려서 보여드려요.
        </p>

        <form className="onboarding__form" onSubmit={handleSubmit}>
          <div className="onboarding__field">
            <span className="onboarding__label">업종</span>
            <div className="pill-group pill-group--grid" role="radiogroup" aria-label="업종">
              {industries.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={industry === option}
                  className={`pill${industry === option ? ' pill--selected' : ''}`}
                  onClick={() => setIndustry(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="onboarding__field">
            <span className="onboarding__label">사업자 유형</span>
            <div className="pill-group" role="radiogroup" aria-label="사업자 유형">
              <button
                type="button"
                role="radio"
                aria-checked={!isCorporation}
                className={`pill pill--flex${!isCorporation ? ' pill--selected' : ''}`}
                onClick={() => setIsCorporation(false)}
              >
                개인사업자
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isCorporation}
                className={`pill pill--flex${isCorporation ? ' pill--selected' : ''}`}
                onClick={() => setIsCorporation(true)}
              >
                법인
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`toggle-row${hasEmployee ? ' toggle-row--active' : ''}`}
            aria-pressed={hasEmployee}
            onClick={() => setHasEmployee((prev) => !prev)}
          >
            <span>직원이 있어요</span>
            <span className={`switch${hasEmployee ? ' switch--on' : ''}`}>
              <span className="switch__knob" />
            </span>
          </button>

          <button
            type="button"
            className={`toggle-row${isRented ? ' toggle-row--active' : ''}`}
            aria-pressed={isRented}
            onClick={() => setIsRented((prev) => !prev)}
          >
            <span>임대 사업장이에요</span>
            <span className={`switch${isRented ? ' switch--on' : ''}`}>
              <span className="switch__knob" />
            </span>
          </button>

          <label className="onboarding__field">
            <span className="onboarding__label">폐업 예정일</span>
            <input
              type="date"
              className="onboarding__date"
              value={closureDate}
              onChange={(e) => setClosureDate(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="onboarding__submit" disabled={!closureDate}>
            {initialProfile ? '조건 저장하고 돌아가기' : '맞춤 체크리스트 보기'}
          </button>

          <p className="onboarding__note">
            입력한 정보는 이 기기에만 저장되며, 별도 회원가입 없이 이용할 수 있어요.
          </p>
        </form>
      </div>
    </main>
  )
}

export default OnboardingForm
