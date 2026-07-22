import { Link } from 'react-router-dom'
import { useRoutineToday } from '@/hooks/useRoutineToday'
import Sidebar from '@/components/Sidebar'
import WeekStrip from '@/components/WeekStrip'
import SessionCard from '@/components/SessionCard'
import SkipResultPanel from '@/components/SkipResultPanel'

function RoutineToday() {
  const { data, loading, error, refetch } = useRoutineToday()

  const handleComplete = () => {
    fetch(`/api/sessions/${data.routineDayId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(() => {
      refetch()
    })
  }

  const handleSkip = () => {
    fetch(`/api/sessions/${data.routineDayId}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(() => {
      refetch()
    })
  }

  if (loading) {
    return <p className="p-8 text-text-secondary">로딩 중...</p>
  }

  if (error) {
    return (
      <p className="p-8 text-text-secondary">
        서버에 연결할 수 없습니다. 백엔드(server)가 실행 중인지 확인해주세요.
      </p>
    )
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
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar weekProgress={data.weekProgress} routine={data.routine} />
      <main className="max-w-[1080px] flex-1 p-8">
        <WeekStrip days={data.days} today={data.dayOfWeek} />
        <div className="mt-6">
          {data.targetArea === null ? (
            <p className="text-text-secondary">오늘은 휴식일입니다.</p>
          ) : data.status === 'SKIPPED' ? (
            <SkipResultPanel
              reassigned={!!data.skippedTo}
              fromDayOfWeek={data.dayOfWeek}
              toDayOfWeek={data.skippedTo?.dayOfWeek}
            />
          ) : (
            <SessionCard
              routineDayId={data.routineDayId}
              targetArea={data.targetArea}
              exercises={data.exercises}
              status={data.status}
              onComplete={handleComplete}
              onSkip={handleSkip}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default RoutineToday
