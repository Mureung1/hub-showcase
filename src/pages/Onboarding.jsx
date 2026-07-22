import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

function Onboarding() {
  const [selectedDays, setSelectedDays] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = () => {
    setError(null)
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daysPerWeek: selectedDays }),
    })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) {
          setError(json.error)
          return
        }
        navigate('/onboarding/review')
      })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-[480px]">
        <h1 className="mb-2 text-[28px] font-extrabold tracking-[-.02em] text-text">
          주당 운동 가능 일수를 알려주세요
        </h1>
        <p className="mb-8 text-[14px] leading-relaxed text-text-secondary">
          가능일수에 맞는 분할을 추천해드려요. 나중에 요일별로 직접 수정할 수 있어요.
        </p>

        {error && <p className="mb-6 text-[13px] text-text-secondary">⚠ {error}</p>}

        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {DAY_OPTIONS.map((day) => {
            const isSelected = selectedDays === day
            return (
              <button key={day} onClick={() => setSelectedDays(day)} className="flex flex-col items-center gap-2">
                <span
                  className={
                    isSelected
                      ? 'flex h-11 w-11 items-center justify-center rounded-full border-2 border-accent text-accent'
                      : 'flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-secondary'
                  }
                >
                  <span className="font-display text-lg font-semibold">{day}</span>
                </span>
                <span className="text-xs text-text-secondary">일</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={selectedDays === null}
          className={
            selectedDays === null
              ? 'w-full cursor-not-allowed rounded-pill bg-disabled px-6 py-[15px] text-[15px] font-bold text-muted'
              : 'w-full rounded-pill bg-accent px-6 py-[15px] text-[15px] font-bold text-on-accent hover:bg-accent-hover'
          }
        >
          추천받기
        </button>
      </div>
    </div>
  )
}

export default Onboarding
