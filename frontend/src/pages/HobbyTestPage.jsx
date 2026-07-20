import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { hobbyQuestions } from '../data/hobbyQuestions'
import './HobbyTestPage.css'

export default function HobbyTestPage() {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  // 전체 답변을 { 문항id: 선택지id } 형태의 객체로 관리 (예: { 1: '1-A', 3: '3-O' })
  const [answers, setAnswers] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const totalQuestions = hobbyQuestions.length
  const currentQuestion = hobbyQuestions[currentIndex]
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
        await apiClient.post('/tests/hobby', { answers })
        setIsSubmitted(true)
        setTimeout(() => {
          navigate('/select-purpose')
        }, 1000)
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

  if (isSubmitted) {
    return (
      <div className="hobby-test-page">
        <div className="hobby-test-card">
          <div className="hobby-test-done">
            <span className="hobby-test-q-badge">✓</span>
            <p className="hobby-test-done-text">테스트가 완료되었습니다!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hobby-test-page">
      <div className="hobby-test-card">
        <div className="hobby-test-header">
          <button
            type="button"
            className="hobby-test-back"
            onClick={handlePrev}
            disabled={isFirstQuestion}
          >
            ←
          </button>
          <h1 className="hobby-test-title">취미 발견 테스트</h1>
          <span className="hobby-test-counter">
            {currentIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="hobby-test-progress-track">
          <div className="hobby-test-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="hobby-test-question">
          <span className="hobby-test-q-badge">Q</span>
          <p className="hobby-test-question-text">{currentQuestion.question}</p>
        </div>
        <p className="hobby-test-hint">직감적으로 골라주세요!</p>

        <div className="hobby-test-options">
          {currentQuestion.options.map((option) => {
            // 선택지 id는 `${문항번호}-${코드}` 형태라 코드 부분만 뽑아 배지로 표시 ('1-A' → 'A')
            const badgeLabel = option.id.split('-')[1]
            const isSelected = selectedOptionId === option.id
            return (
              <button
                type="button"
                key={option.id}
                className={`hobby-test-option${isSelected ? ' hobby-test-option-selected' : ''}`}
                onClick={() => handleSelectOption(option.id)}
              >
                <span className="hobby-test-option-badge">{badgeLabel}</span>
                <span className="hobby-test-option-text">{option.text}</span>
              </button>
            )
          })}
        </div>

        {submitError && <p className="hobby-test-error">{submitError}</p>}

        <div className="hobby-test-footer">
          <button
            type="button"
            className="hobby-test-prev-button"
            onClick={handlePrev}
            disabled={isFirstQuestion || isSubmitting}
          >
            이전
          </button>
          <button
            type="button"
            className="hobby-test-next-button"
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
