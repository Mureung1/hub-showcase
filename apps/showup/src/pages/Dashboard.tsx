import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from '@/hooks/useAuth'
import { listTodayReservations, listReservations } from '@/services/reservations'
import { getTopRiskyCustomers } from '@/services/customers'
import { calculateDashboardStats } from '@/utils/dashboard'
import type { CustomerSearchResult } from '@/types/schema'
import type { ReservationWithId } from '@/services/reservations'

const Dashboard = () => {
  const { user } = useAuthState()
  const [isLoading, setIsLoading] = useState(true)
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
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [user])

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">오늘의 예약과 주의 고객을 확인하세요</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">오늘 예약</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{todayCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">방문</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{todayVisited}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">노쇼</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{todayNoShow}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">월 노쇼율</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{noShowRate}%</p>
        </div>
      </div>

      {/* Attention customers */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">주의 고객</h2>
          <Link
            to="/app/customers"
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            전체 보기 →
          </Link>
        </div>
        {attentionCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>등록된 주의 고객이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attentionCustomers.map((customer) => (
              <Link
                key={customer.id}
                to={`/customers/${customer.id}`}
                className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{customer.phoneMasked}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      위험 {customer.riskStats.score}점
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      노쇼 {customer.riskStats.noShowCount}회
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Today's reservations */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">오늘의 예약</h2>
          <Link
            to="/app/reservations"
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            전체 보기 →
          </Link>
        </div>
        {todayReservations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>오늘 예약이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayReservations.map((res) => (
              <Link
                key={res.id}
                to={`/app/reservations`}
                className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{res.time}</p>
                    <p className="text-sm text-gray-500 mt-1">{res.memo || '메모 없음'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {res.status === 'visited' ? '방문' : res.status === 'noShow' ? '노쇼' : res.status === 'cancelled' ? '취소' : '대기'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard
