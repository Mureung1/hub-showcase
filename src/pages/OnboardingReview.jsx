import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const KOREAN_DAY_LABEL = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' }

function fetchToday() {
  return fetch('/api/routine/today').then((res) => res.json())
}

function DayEditCard({ day, options, onChange }) {
  const [editing, setEditing] = useState(false)
  const isRest = day.targetArea === null

  return (
    <div className="rounded-md border border-border bg-day-default p-3">
      <div className="mb-1 text-sm font-semibold text-text">{KOREAN_DAY_LABEL[day.dayOfWeek]}</div>
      <div className="mb-2 text-sm text-text-secondary">{isRest ? '휴식' : day.targetArea}</div>
      {editing ? (
        <div className="flex flex-wrap gap-1.5">
          {[...options, null].map((option) => (
            <button
              key={option ?? 'rest'}
              onClick={async () => {
                await onChange(day.id, option)
                setEditing(false)
              }}
              className="rounded-pill border border-border px-2.5 py-1 text-xs text-text-secondary hover:border-outline-hover"
            >
              {option ?? '휴식'}
            </button>
          ))}
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs text-accent hover:text-link-hover">
          변경
        </button>
      )}
    </div>
  )
}

function OnboardingReview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchToday().then(setData)
  }, [])

  const handleChange = async (routineDayId, targetArea) => {
    setError(null)
    const res = await fetch(`/api/routine/days/${routineDayId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetArea }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error)
      return
    }
    setData(await fetchToday())
  }

  if (!data) {
    return <p className="p-8 text-text-secondary">로딩 중...</p>
  }

  if (!data.hasRoutine) {
    return (
      <div className="p-8 text-text-secondary">
        아직 루틴이 없습니다.{' '}
        <Link to="/onboarding" className="text-accent hover:text-link-hover">
          온보딩을 먼저 완료해주세요.
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg px-6 py-12">
      <div className="w-full max-w-[720px]">
        <h1 className="mb-2 text-[28px] font-extrabold tracking-[-.02em] text-text">
          {data.routine.splitType} 분할을 추천했어요
        </h1>
        <p className="mb-8 text-[14px] text-text-secondary">마음에 안 드는 요일이 있으면 직접 바꿀 수 있어요.</p>

        {error && <p className="mb-6 text-[13px] text-text-secondary">⚠ {error}</p>}

        <div className="mb-8 grid grid-cols-7 gap-3">
          {data.days.map((day) => (
            <DayEditCard key={day.id} day={day} options={data.availableDayTypes} onChange={handleChange} />
          ))}
        </div>

        <button
          onClick={() => navigate('/routine')}
          className="w-full rounded-pill bg-accent px-6 py-[15px] text-[15px] font-bold text-on-accent hover:bg-accent-hover"
        >
          확정하고 시작하기
        </button>
      </div>
    </div>
  )
}

export default OnboardingReview
