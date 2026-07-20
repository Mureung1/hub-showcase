import { useEffect, useState } from 'react'
import { useAuthState } from '@/hooks/useAuth'
import { getDashboardData } from '@/services/dashboard'
import type { DashboardData } from '@/services/dashboard'
import type { ReservationStatus } from '@/types/schema'
import RiskBadge from '@/components/RiskBadge'

const Dashboard = () => {
  const { user } = useAuthState()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const result = await getDashboardData(user.uid)
      setData(result)
      setLoading(false)
    }
    load()
  }, [user])

  const statusLabel: Record<ReservationStatus, string> = {
    pending: '대기',
    confirmed: '확정',
    visited: '방문',
    noShow: '노쇼',
    cancelled: '취소',
  }

  const statusColor: Record<ReservationStatus, string> = {
    pending: 'text-yellow-600',
    confirmed: 'text-blue-600',
    visited: 'text-green-600',
    noShow: 'text-red-600',
    cancelled: 'text-gray-500',
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>불러오는 중...</p>
      </div>
    )
  }

  const stats = data ?? {
    todayReservations: 0,
    todayVisited: 0,
    todayNoShow: 0,
    thisMonthNoShowRate: 0,
    attentionCustomers: [],
    todayReservationList: [],
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
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayReservations}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">방문</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.todayVisited}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">노쇼</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.todayNoShow}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">월 노쇼율</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.thisMonthNoShowRate}%</p>
        </div>
      </div>

      {/* Attention customers */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">주의 고객</h2>
        {stats.attentionCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>등록된 주의 고객이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.attentionCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-sm text-gray-500">{customer.phoneMasked}</p>
                </div>
                <RiskBadge score={customer.riskStats.score} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Today's reservations */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">오늘의 예약</h2>
        {stats.todayReservationList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>오늘 예약이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.todayReservationList.map((res) => (
              <div
                key={res.id}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{res.time}</p>
                  <p className="text-sm text-gray-500">{res.customerId}</p>
                </div>
                <span className={`text-sm font-medium ${statusColor[res.status]}`}>
                  {statusLabel[res.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard
