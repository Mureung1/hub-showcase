import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import friendIllustration from '../assets/illustrations/roommate-type-friend.png'
import businessIllustration from '../assets/illustrations/roommate-type-business.png'
import './RoommateTypeSelectPage.css'

const ROOMMATE_TYPES = [
  {
    id: 'FRIEND',
    apiValue: 'friend',
    image: friendIllustration,
    title: '친구형 룸메',
    description: '취미와 생활 성향을 함께 고려해 친구처럼 지낼 룸메이트를 찾아요',
  },
  {
    id: 'BUSINESS',
    apiValue: 'business',
    image: businessIllustration,
    title: '비즈니스형 룸메',
    description: '생활 성향 위주로, 서로 간섭 없이 깔끔하게 지낼 룸메이트를 찾아요',
  },
]

export default function RoommateTypeSelectPage() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleNext = async () => {
    if (!selectedType) return
    const selected = ROOMMATE_TYPES.find((type) => type.id === selectedType)

    setIsSubmitting(true)
    setSubmitError('')
    try {
      await apiClient.post('/roommate-profile', { roommateType: selected.apiValue })
      navigate('/select-purpose')
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ?? '저장 중 오류가 발생했습니다. 다시 시도해주세요.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="roommate-type-select-page">
      <h1 className="roommate-type-select-title">어떤 룸메이트를 찾고 있나요?</h1>

      <div className="roommate-type-select-card-row">
        {ROOMMATE_TYPES.map((type) => {
          const isSelected = selectedType === type.id
          return (
            <button
              type="button"
              key={type.id}
              className={`roommate-type-select-card${isSelected ? ' roommate-type-select-card-selected' : ''}`}
              onClick={() => setSelectedType(type.id)}
            >
              <img src={type.image} alt={type.title} className="roommate-type-select-card-image" />
              <div className="roommate-type-select-card-title">{type.title}</div>
              <div className="roommate-type-select-card-sub">{type.description}</div>
            </button>
          )
        })}
      </div>

      {submitError && <p className="roommate-type-select-error">{submitError}</p>}

      <button
        type="button"
        className="roommate-type-select-next-button"
        onClick={handleNext}
        disabled={!selectedType || isSubmitting}
      >
        {isSubmitting ? '저장 중...' : '다음'}
      </button>
    </div>
  )
}
