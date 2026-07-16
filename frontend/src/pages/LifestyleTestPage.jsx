import { useState } from 'react'
import { apiClient } from '../api/client'
import { lifestyleQuestions } from '../data/lifestyleQuestions'
import './LifestyleTestPage.css'

export default function LifestyleTestPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  // 전체 답변을 { 문항id: 선택지id } 형태의 객체로 관리 (예: { 1: '1-A', 3: '3-C' })
  const [answers, setAnswers] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isDone, setIsDone] = useState(false)

  const totalQuestions = lifestyleQuestions.length
  const currentQuestion = lifestyleQuestions[currentIndex]
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
        await apiClient.post('/tests/lifestyle', { answers })
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
      <div className="lifestyle-test-page">
        <div className="lifestyle-test-card">
          <div className="lifestyle-test-done">
            <span className="lifestyle-test-q-badge">✓</span>
            <p className="lifestyle-test-done-text">테스트가 완료되었습니다!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="lifestyle-test-page">
      <div className="lifestyle-test-card">
        <div className="lifestyle-test-header">
          <button
            type="button"
            className="lifestyle-test-back"
            onClick={handlePrev}
            disabled={isFirstQuestion}
          >
            ←
          </button>
          <h1 className="lifestyle-test-title">생활성향 테스트</h1>
          <span className="lifestyle-test-counter">
            {currentIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="lifestyle-test-progress-track">
          <div className="lifestyle-test-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="lifestyle-test-question">
          <span className="lifestyle-test-q-badge">Q</span>
          <p className="lifestyle-test-question-text">{currentQuestion.question}</p>
        </div>
        <p className="lifestyle-test-hint">직감적으로 골라주세요!</p>

        <div className="lifestyle-test-options">
          {currentQuestion.options.map((option) => {
            // 선택지 id는 `${문항번호}-${코드}` 형태라 코드 부분만 뽑아 배지로 표시 ('1-A' → 'A')
            const badgeLabel = option.id.split('-')[1]
            const isSelected = selectedOptionId === option.id
            return (
              <button
                type="button"
                key={option.id}
                className={`lifestyle-test-option${isSelected ? ' lifestyle-test-option-selected' : ''}`}
                onClick={() => handleSelectOption(option.id)}
              >
                <span className="lifestyle-test-option-badge">{badgeLabel}</span>
                <span className="lifestyle-test-option-text">{option.text}</span>
              </button>
            )
          })}
        </div>

        {submitError && <p className="lifestyle-test-error">{submitError}</p>}

        <div className="lifestyle-test-footer">
          <button
            type="button"
            className="lifestyle-test-prev-button"
            onClick={handlePrev}
            disabled={isFirstQuestion || isSubmitting}
          >
            이전
          </button>
          <button
            type="button"
            className="lifestyle-test-next-button"
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
