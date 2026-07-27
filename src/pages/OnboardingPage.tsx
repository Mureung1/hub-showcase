import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CHALLENGE_CATEGORIES } from '../api/challenges.ts'
import { updatePreferredCategory } from '../api/client.ts'
import Layout from '../components/Layout.tsx'

function OnboardingPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSelect(category: string | null) {
    setIsSubmitting(true)

    try {
      await updatePreferredCategory(category)
      navigate('/')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout hideNav title="주제 취향 선택">
      <p className="mb-5 rounded-[10px] bg-accent-bg px-3 py-2.5 text-xs text-muted">
        선호하는 주제를 골라두면, 오늘의 챌린지가 그 주제 위주로 나와요. 나중에 설정에서 언제든 바꿀 수 있고, 지금
        고르지 않아도 괜찮아요.
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {CHALLENGE_CATEGORIES.map((category) => (
          <button
            className="rounded-2xl border border-border bg-card px-4 py-5 text-[15px] font-semibold text-heading disabled:opacity-50"
            disabled={isSubmitting}
            key={category}
            onClick={() => handleSelect(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>

      <button
        className="mt-4 w-full rounded-full border border-border px-4 py-3 text-[15px] font-semibold text-heading disabled:opacity-50"
        disabled={isSubmitting}
        onClick={() => handleSelect(null)}
        type="button"
      >
        선택 안 함
      </button>
    </Layout>
  )
}

export default OnboardingPage
