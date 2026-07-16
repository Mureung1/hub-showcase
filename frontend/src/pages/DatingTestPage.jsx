import { useState } from 'react'
import { apiClient } from '../api/client'
import { datingQuestions } from '../data/datingQuestions'
import './DatingTestPage.css'

export default function DatingTestPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  // 전체 답변을 { 문항id: 선택지id } 형태의 객체로 관리 (예: { 1: '1-A', 3: '3-A' })
  const [answers, setAnswers] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isDone, setIsDone] = useState(false)

  const totalQuestions = datingQuestions.length
  const currentQuestion = datingQuestions[currentIndex]
  const isFirstQuestion = currentIndex === 0
  const isLastQuestion = currentIndex === totalQuestions - 1
  const selectedOptionId = answers[currentQuestion.id]
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100

  const handleSelectOption = (optionId) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }))
  }

  const handlePrev = () => {
    if (isFirstQuestion) return
    setCurrentIndex((prev) => prev - 1)
  }

  const handleNext = async () => {
    if (!selectedOptionId) return
    if (isLastQuestion) {
      setIsSubmitting(true)
      setSubmitError('')
      try {
        await apiClient.post('/tests/dating', { answers })
        setIsDone(true)
      } catch (err) {
        setSubmitError(
          err.response?.data?.message ?? '테스트 결과 저장 중 오류가 발생했습니다. 다시 시도해주세요.',
        )
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    setCurrentIndex((prev) => prev + 1)
  }

  if (isDone) {
    return (
      <div className="dating-test-page">
        <div className="dating-test-card">
          <div className="dating-test-done">
            <span className="dating-test-q-badge">✓</span>
            <p className="dating-test-done-text">테스트가 완료되었습니다!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dating-test-page">
      <div className="dating-test-card">
        <div className="dating-test-header">
          <button
            type="button"
            className="dating-test-back"
            onClick={handlePrev}
            disabled={isFirstQuestion}
          >
            ←
          </button>
          <h1 className="dating-test-title">이상형 테스트</h1>
          <span className="dating-test-counter">
            {currentIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="dating-test-progress-track">
          <div className="dating-test-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="dating-test-question">
          <span className="dating-test-q-badge">Q</span>
          <p className="dating-test-question-text">{currentQuestion.question}</p>
        </div>
        <p className="dating-test-hint">직감적으로 골라주세요!</p>

        <div className="dating-test-options">
          {currentQuestion.options.map((option) => {
            // 선택지 id는 `${문항번호}-${코드}` 형태라 코드 부분만 뽑아 배지로 표시 ('1-A' → 'A')
            const badgeLabel = option.id.split('-')[1]
            const isSelected = selectedOptionId === option.id
            return (
              <button
                type="button"
                key={option.id}
                className={`dating-test-option${isSelected ? ' dating-test-option-selected' : ''}`}
                onClick={() => handleSelectOption(option.id)}
              >
                <span className="dating-test-option-badge">{badgeLabel}</span>
                <span className="dating-test-option-text">{option.text}</span>
              </button>
            )
          })}
        </div>

        {submitError && <p className="dating-test-error">{submitError}</p>}

        <div className="dating-test-footer">
          <button
            type="button"
            className="dating-test-prev-button"
            onClick={handlePrev}
            disabled={isFirstQuestion || isSubmitting}
          >
            이전
          </button>
          <button
            type="button"
            className="dating-test-next-button"
            onClick={handleNext}
            disabled={!selectedOptionId || isSubmitting}
          >
            {isLastQuestion ? (isSubmitting ? '저장 중...' : '완료') : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
