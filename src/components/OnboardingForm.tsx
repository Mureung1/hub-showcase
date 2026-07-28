import { useState, useEffect, type FormEvent } from 'react'
import type { Profile } from '../types'
import './OnboardingForm.css'

interface OnboardingFormProps {
  onComplete: (profile: Profile) => void
  initialProfile?: Profile | null
}

const industries = ['요식업', '소매업', '서비스업', '기타']

const stepLabels = ['업종', '사업자 유형', '직원 유무', '임대 여부', '폐업 예정일']

function OnboardingForm({ onComplete, initialProfile }: OnboardingFormProps) {
  const [step, setStep] = useState(0)
  const [industry, setIndustry] = useState(initialProfile?.industry ?? industries[0])
  const [isCorporation, setIsCorporation] = useState(initialProfile?.isCorporation ?? false)
  const [hasEmployee, setHasEmployee] = useState(initialProfile?.hasEmployee ?? false)
  const [isRented, setIsRented] = useState(initialProfile?.isRented ?? false)
  const [closureDate, setClosureDate] = useState(initialProfile?.closureDate ?? '')
  const [justNavigated, setJustNavigated] = useState(false)

  const isLastStep = step === stepLabels.length - 1

  function goNext() {
    setStep((prev) => Math.min(prev + 1, stepLabels.length - 1))
    setJustNavigated(true)
  }

  function goBack() {
    setStep((prev) => Math.max(prev - 1, 0))
  }

  // "다음" 클릭 직후 제출 버튼이 즉시 활성화되면 연속 클릭으로 step 4가 건너뛰어지는
  // 문제를 방지하기 위해 200ms 동안 제출 버튼을 비활성화한다
  useEffect(() => {
    if (!justNavigated) return
    const t = setTimeout(() => setJustNavigated(false), 200)
    return () => clearTimeout(t)
  }, [justNavigated])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (step !== stepLabels.length - 1 || !closureDate) return
    onComplete({ industry, isCorporation, hasEmployee, isRented, closureDate })
  }

  return (
    <main className="onboarding">
      <aside className="onboarding__aside">
        <div className="onboarding__blob onboarding__blob--green" />
        <div className="onboarding__blob onboarding__blob--pink" />

        <span className="onboarding__brand">소상공인 폐업 도우미</span>
        <h2 className="onboarding__aside-title">
          몇 가지만 알려주시면
          <br />
          맞춤 절차를 정리해드려요
        </h2>

        <ol className="onboarding__aside-steps">
          {stepLabels.map((label, i) => (
            <li
              key={label}
              className={`onboarding__aside-step${
                i === step ? ' onboarding__aside-step--current' : ''
              }${i < step ? ' onboarding__aside-step--done' : ''}`}
            >
              <span className="onboarding__aside-step-index">
                {i < step ? '✓' : i + 1}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>

        <span className="onboarding__duration">약 1분 소요</span>
      </aside>

      <div className="onboarding__stage">
        <form className="onboarding__card" onSubmit={handleSubmit}>
          <span className="onboarding__badge">1분 진단 · {stepLabels[step]}</span>

          {step === 0 && (
            <div className="onboarding__step">
              <h1>업종이 어떻게 되세요?</h1>
              <p className="onboarding__lead">가장 가까운 업종을 골라주세요.</p>
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
          )}

          {step === 1 && (
            <div className="onboarding__step">
              <h1>개인사업자세요, 법인이세요?</h1>
              <p className="onboarding__lead">해당하는 사업자 유형을 골라주세요.</p>
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
          )}

          {step === 2 && (
            <div className="onboarding__step">
              <h1>직원이 있으세요?</h1>
              <p className="onboarding__lead">4대보험 상실신고 대상인지 확인하는 데 써요.</p>
              <div className="pill-group" role="radiogroup" aria-label="직원 유무">
                <button
                  type="button"
                  role="radio"
                  aria-checked={hasEmployee}
                  className={`pill pill--flex${hasEmployee ? ' pill--selected' : ''}`}
                  onClick={() => setHasEmployee(true)}
                >
                  예
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!hasEmployee}
                  className={`pill pill--flex${!hasEmployee ? ' pill--selected' : ''}`}
                  onClick={() => setHasEmployee(false)}
                >
                  아니요
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding__step">
              <h1>임대 사업장이세요?</h1>
              <p className="onboarding__lead">임대차 해지·점포철거비 지원 대상인지 확인해요.</p>
              <div className="pill-group" role="radiogroup" aria-label="임대 여부">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isRented}
                  className={`pill pill--flex${isRented ? ' pill--selected' : ''}`}
                  onClick={() => setIsRented(true)}
                >
                  예
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!isRented}
                  className={`pill pill--flex${!isRented ? ' pill--selected' : ''}`}
                  onClick={() => setIsRented(false)}
                >
                  아니요
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding__step">
              <h1>폐업 예정일이 언제예요?</h1>
              <p className="onboarding__lead">각 절차의 마감일을 계산하는 기준일이에요.</p>
              <input
                type="date"
                className="onboarding__date"
                value={closureDate}
                onChange={(e) => setClosureDate(e.target.value)}
                required
              />
            </div>
          )}

          <div className="onboarding__dots">
            {stepLabels.map((label, i) => (
              <span
                key={label}
                className={`onboarding__dot${i === step ? ' onboarding__dot--active' : ''}`}
              />
            ))}
          </div>

          <div className="onboarding__nav">
            {step > 0 ? (
              <button type="button" className="onboarding__back" onClick={goBack}>
                이전
              </button>
            ) : (
              <span />
            )}

            {isLastStep ? (
              <button type="submit" className="onboarding__submit" disabled={!closureDate || justNavigated}>
                {initialProfile ? '조건 저장하고 돌아가기' : '맞춤 체크리스트 보기'}
              </button>
            ) : (
              <button type="button" className="onboarding__submit" onClick={goNext}>
                다음
              </button>
            )}
          </div>
        </form>

        <p className="onboarding__note">
          입력한 정보는 이 기기에만 저장되며, 별도 회원가입 없이 이용할 수 있어요.
        </p>
      </div>
    </main>
  )
}

export default OnboardingForm
