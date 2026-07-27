import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './PersonalType.css'

export type TastePreferences = {
  spicy: number
  valueForMoney: number
  atmosphere: number
  waiting: number
  quietness: number
}

type TastePreferenceKey = keyof TastePreferences

type PreferenceItem = {
  key: TastePreferenceKey
  title: string
  question: string
  lowLabel: string
  highLabel: string
}

const INITIAL_PREFERENCES: TastePreferences = {
  spicy: 5,
  valueForMoney: 5,
  atmosphere: 5,
  waiting: 5,
  quietness: 5,
}

const PREFERENCE_ITEMS: PreferenceItem[] = [
  {
    key: 'spicy',
    title: '매운맛 선호도',
    question: '어느 정도 매운 음식을 좋아하나요?',
    lowLabel: '순한 맛 선호',
    highLabel: '매운 맛 선호',
  },
  {
    key: 'valueForMoney',
    title: '가성비 중요도',
    question: '가게를 선택할 때 가성비를 얼마나 중요하게 생각하나요?',
    lowLabel: '중요하지 않음',
    highLabel: '매우 중요함',
  },
  {
    key: 'atmosphere',
    title: '분위기 중요도',
    question: '가게를 선택할 때 분위기를 얼마나 중요하게 생각하나요?',
    lowLabel: '중요하지 않음',
    highLabel: '매우 중요함',
  },
  {
    key: 'waiting',
    title: '웨이팅 허용도',
    question: '마음에 드는 가게라면 얼마나 기다릴 수 있나요?',
    lowLabel: '기다리기 싫음',
    highLabel: '오래 기다려도 괜찮음',
  },
  {
    key: 'quietness',
    title: '조용함 선호도',
    question: '어떤 분위기의 공간을 더 좋아하나요?',
    lowLabel: '활기찬 공간 선호',
    highLabel: '조용한 공간 선호',
  },
]

type PersonalTypeProps = {
  compact?: boolean
  values?: TastePreferences
  submitLabel?: string
  submittingLabel?: string
  isSubmitting?: boolean
  onChange?: (preferences: TastePreferences) => void
  onBack?: () => void
  onSubmit?: (preferences: TastePreferences) => void | Promise<void>
  statusMessage?: string
  errorMessage?: string
}

function PersonalType({
  compact = false,
  values,
  submitLabel = '이 취향으로 시작하기',
  submittingLabel = '가입 중...',
  isSubmitting = false,
  onChange,
  onBack,
  onSubmit,
  statusMessage = '',
  errorMessage = '',
}: PersonalTypeProps) {
  const navigate = useNavigate()
  const [localPreferences, setLocalPreferences] =
    useState<TastePreferences>(INITIAL_PREFERENCES)
  const preferences = values ?? localPreferences

  const handlePreferenceChange =
    (key: TastePreferenceKey) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value)
      const nextPreferences = { ...preferences, [key]: value }
      if (values === undefined) setLocalPreferences(nextPreferences)
      onChange?.(nextPreferences)
    }

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (onSubmit) {
      void onSubmit(preferences)
      return
    }
    console.log('저장할 취향 설정:', preferences)
  }

  return (
    <main
      className={`personal-type-page${compact ? ' personal-type-page--compact' : ''}`}
    >
      <div className="personal-type-page__container">
        <header className="personal-type-page__header">
          <button
            className="personal-type-page__back"
            type="button"
            aria-label="이전 페이지로 돌아가기"
            onClick={() => (onBack ? onBack() : navigate(-1))}
          >
            <span aria-hidden="true">←</span>
          </button>

          <div className="personal-type-page__heading">
            <span className="personal-type-page__eyebrow">나만의 TasteFit</span>
            <h1>내 취향을 알려주세요</h1>
            <p>
              설정한 취향을 바탕으로
              <br />
              나와 비슷한 사람이 작성한 리뷰를 먼저 보여드려요.
            </p>
          </div>
        </header>

        <form className="personal-type-form" onSubmit={handleSave}>
          <div className="personal-type-form__list">
            {PREFERENCE_ITEMS.map((item) => {
              const inputId = `preference-${item.key}`
              const value = preferences[item.key]

              return (
                <section className="preference-card" key={item.key}>
                  <div className="preference-card__title-row">
                    <label htmlFor={inputId}>{item.title}</label>
                    <output
                      className="preference-card__score"
                      htmlFor={inputId}
                      aria-live="polite"
                    >
                      <strong>{value}</strong>
                      <span>점</span>
                    </output>
                  </div>

                  <p id={`${inputId}-question`}>{item.question}</p>

                  <input
                    id={inputId}
                    className="preference-card__slider"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={value}
                    aria-describedby={`${inputId}-question ${inputId}-labels`}
                    onChange={handlePreferenceChange(item.key)}
                  />

                  <div
                    className="preference-card__range-labels"
                    id={`${inputId}-labels`}
                  >
                    <span>{item.lowLabel}</span>
                    <span>{item.highLabel}</span>
                  </div>
                </section>
              )
            })}
          </div>

          <div className="personal-type-form__actions">
            {statusMessage && (
              <p className="personal-type-form__status" role="status">{statusMessage}</p>
            )}
            {errorMessage && (
              <p className="personal-type-form__error" role="alert">{errorMessage}</p>
            )}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default PersonalType
