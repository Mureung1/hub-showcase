import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from '@/hooks/useAuth'
import { listTodayReservations, listReservations } from '@/services/reservations'
import { getTopRiskyCustomers } from '@/services/customers'
import { calculateDashboardStats } from '@/utils/dashboard'
import type { CustomerSearchResult } from '@/types/schema'
import type { ReservationWithId } from '@/services/reservations'
import Icon from '@/components/ui/Icon'

const dashboardDate = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})

const statusLabel: Record<ReservationWithId['status'], string> = {
  pending: '대기',
  confirmed: '확정',
  visited: '방문',
  noShow: '노쇼',
  cancelled: '취소',
}

const Dashboard = () => {
  const { user } = useAuthState()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [todayCount, setTodayCount] = useState(0)
  const [todayVisited, setTodayVisited] = useState(0)
  const [todayNoShow, setTodayNoShow] = useState(0)
  const [noShowRate, setNoShowRate] = useState(0)
  const [attentionCustomers, setAttentionCustomers] = useState<CustomerSearchResult[]>([])
  const [todayReservations, setTodayReservations] = useState<ReservationWithId[]>([])

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      setError(null)
      try {
        const [todayRes, allReservations, riskyCustomers] = await Promise.all([
          listTodayReservations(user.uid),
          listReservations(user.uid),
          getTopRiskyCustomers(user.uid, 5),
        ])

        const stats = calculateDashboardStats(allReservations)

        setTodayCount(todayRes.length)
        setTodayVisited(todayRes.filter((r) => r.status === 'visited').length)
        setTodayNoShow(todayRes.filter((r) => r.status === 'noShow').length)
        setNoShowRate(stats.month.noShowRate)
        setAttentionCustomers(riskyCustomers)
        setTodayReservations(todayRes)
      } catch (err) {
        console.error('Failed to load dashboard:', err)
        setError('데이터를 불러오지 못했습니다')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [user])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8">
        로딩 중...
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm">
          <p className="font-medium text-red-700">{error}</p>
          <p className="mt-1 text-red-600">잠시 후 다시 시도해 주세요.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-300 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
            Overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">대시보드</h1>
          <p className="mt-2 text-sm text-slate-600">오늘의 예약과 주의 고객을 한눈에 확인하세요.</p>
        </div>
        <p className="text-sm font-medium text-slate-500">{dashboardDate.format(new Date())}</p>
      </header>

      {/* Summary cards */}
      <div className="mb-7 grid grid-cols-2 gap-3 border-b border-slate-300 pb-7 pt-7 lg:grid-cols-4 lg:gap-4">
        {[
          { label: '오늘 예약', value: todayCount, icon: 'calendar' as const, tone: 'blue' },
          { label: '방문', value: todayVisited, icon: 'check' as const, tone: 'green' },
          { label: '노쇼', value: todayNoShow, icon: 'warning' as const, tone: 'red' },
          { label: '월 노쇼율', value: `${noShowRate}%`, icon: 'dashboard' as const, tone: 'slate' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="group rounded-xl border border-slate-300 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  stat.tone === 'blue'
                    ? 'bg-blue-50 text-blue-600'
                    : stat.tone === 'green'
                      ? 'bg-emerald-50 text-emerald-600'
                      : stat.tone === 'red'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon name={stat.icon} className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-500">
              {stat.label === '월 노쇼율' ? '이번 달 기준' : '오늘 기준'}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Attention customers */}
        <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Icon name="warning" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">주의 고객</h2>
                <p className="mt-0.5 text-xs text-slate-500">위험 등급 고객만 표시합니다</p>
              </div>
            </div>
            <Link
              to="/app/customers"
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              전체 보기
              <span aria-hidden="true" className="ml-1">→</span>
            </Link>
          </div>
          <div className="mt-5 border-t border-slate-300 pt-5">
            {attentionCustomers.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon name="check" className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-800">현재 주의가 필요한 고객이 없습니다</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  고객 예약과 방문 기록이 쌓이면 위험 고객을 분석해 드립니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attentionCustomers.map((customer) => (
                  <Link
                    key={customer.id}
                    to={`/app/customers/${customer.id}`}
                    className="block rounded-lg border border-slate-200 p-3.5 transition hover:border-rose-200 hover:bg-rose-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{customer.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{customer.phoneMasked}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-rose-600">{customer.riskStats.score}점</p>
                        <p className="mt-1 text-[11px] text-slate-500">노쇼 {customer.riskStats.noShowCount}회</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Today's reservations */}
        <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon name="calendar" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">오늘의 예약</h2>
                <p className="mt-0.5 text-xs text-slate-500">{dashboardDate.format(new Date())}</p>
              </div>
            </div>
            <Link
              to="/app/reservations/new"
              className="inline-flex min-h-10 items-center rounded-lg border border-blue-800 bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              + 예약 등록
            </Link>
          </div>
          <div className="mt-5 border-t border-slate-300 pt-5">
            {todayReservations.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Icon name="calendar" className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-800">오늘 예정된 예약이 없습니다</p>
                <p className="mt-1 text-xs text-slate-500">새 예약을 등록하면 이곳에서 확인할 수 있습니다.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="hidden grid-cols-[5rem_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                  <span>시간</span>
                  <span>메모</span>
                  <span>상태</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {todayReservations.map((res) => (
                    <Link
                      key={res.id}
                      to="/app/reservations"
                      className="grid min-h-16 grid-cols-[4.5rem_1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:grid-cols-[5rem_1fr_auto] sm:gap-4"
                    >
                      <p className="text-sm font-bold text-slate-900">{res.time}</p>
                      <p className="min-w-0 truncate text-sm text-slate-600">{res.memo || '메모 없음'}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          res.status === 'visited'
                            ? 'bg-emerald-50 text-emerald-700'
                            : res.status === 'noShow'
                              ? 'bg-rose-50 text-rose-700'
                              : res.status === 'cancelled'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {statusLabel[res.status]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
