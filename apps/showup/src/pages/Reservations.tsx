import { useState, useEffect } from 'react'
import { useAuthState } from '@/hooks/useAuth'
import { listReservations } from '@/services/reservations'
import { transitionReservationStatusAndRefresh } from '@/services/riskRefresh'
import { getCustomer } from '@/services/customers'
import type { Reservation } from '@/types/schema'
import { toast } from 'sonner'

interface ReservationWithCustomer extends Reservation {
  id: string
  customerName: string
  customerPhoneMasked: string
}

const Reservations = () => {
  const { user } = useAuthState()
  const [reservations, setReservations] = useState<ReservationWithCustomer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<Reservation['status'] | 'all'>('all')

  useEffect(() => {
    const loadReservations = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const allReservations = await listReservations(user.uid)
        
        // 고객 정보 함께 로드
        const enriched = await Promise.all(
          allReservations.map(async (res) => {
            const customer = await getCustomer(user.uid, res.customerId)
            return {
              ...res,
              id: res.id,
              customerName: customer?.name || '알 수 없음',
              customerPhoneMasked: customer?.phoneMasked ?? '****-****',
            } as ReservationWithCustomer
          })
        )

        // 날짜순 정렬 (최신순)
        enriched.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date)
          return a.time.localeCompare(b.time)
        })

        setReservations(enriched)
      } catch (err) {
        console.error('Failed to load reservations:', err)
        setError('예약 목록을 불러오는데 실패했습니다')
        setReservations([])
      } finally {
        setIsLoading(false)
      }
    }

    loadReservations()
  }, [user])

  const handleStatusChange = async (resId: string, customerId: string, nextStatus: Reservation['status']) => {
    if (!user) return

    try {
      await transitionReservationStatusAndRefresh(user.uid, customerId, resId, nextStatus)
      toast.success(`상태가 변경되었습니다: ${nextStatus}`)
      
      // 목록 새로고침
      const allReservations = await listReservations(user.uid)
      const enriched = await Promise.all(
       allReservations.map(async (res) => {
         const customer = await getCustomer(user.uid, res.customerId)
         return {
           ...res,
            id: res.id,
           customerName: customer?.name || '알 수 없음',
           customerPhoneMasked: customer?.phoneMasked ?? '****-****',
         } as ReservationWithCustomer
        })
      )
      enriched.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        return a.time.localeCompare(b.time)
      })
      setReservations(enriched)
    } catch (err) {
      toast.error('상태 변경 실패: ' + (err as Error).message)
    }
  }

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'visited':
        return 'bg-green-100 text-green-800'
      case 'noShow':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusLabel = (status: Reservation['status']) => {
    const labels: Record<Reservation['status'], string> = {
      pending: '대기',
      confirmed: '확정',
      visited: '방문',
      noShow: '노쇼',
      cancelled: '취소',
    }
    return labels[status]
  }

  // 필터링
  const filteredReservations = reservations.filter((res) => {
    if (filterDate && res.date !== filterDate) return false
    if (filterStatus !== 'all' && res.status !== filterStatus) return false
    return true
  })

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">예약 관리</h1>
        <p className="text-sm text-gray-500 mt-1">예약을 확인하고 상태를 기록하세요</p>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">
              날짜 필터
            </label>
            <input
              type="date"
              id="filterDate"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
              상태 필터
            </label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Reservation['status'] | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="pending">대기</option>
              <option value="confirmed">확정</option>
              <option value="visited">방문</option>
              <option value="noShow">노쇼</option>
              <option value="cancelled">취소</option>
            </select>
          </div>
        </div>
        {(filterDate || filterStatus !== 'all') && (
          <button
            onClick={() => {
              setFilterDate('')
              setFilterStatus('all')
            }}
            className="mt-2 text-sm text-blue-600 hover:underline font-medium"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Reservations list */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">예약 목록</h2>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p>로딩 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:underline font-medium"
            >
              다시 시도
            </button>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>
              {filterDate || filterStatus !== 'all'
                ? '필터 조건에 맞는 예약이 없습니다'
                : '등록된 예약이 없습니다'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReservations.map((res) => (
              <div key={res.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{res.customerName}</p>
                    <p className="text-sm text-gray-500">{res.customerPhoneMasked}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {res.date} {res.time}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(res.status)}`}>
                      {getStatusLabel(res.status)}
                    </span>
                  </div>
                </div>
                
                {/* Status action buttons */}
                {res.status === 'pending' || res.status === 'confirmed' ? (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleStatusChange(res.id, res.customerId, 'visited')}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      방문 ✅
                    </button>
                    <button
                      onClick={() => handleStatusChange(res.id, res.customerId, 'noShow')}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      노쇼 ❌
                    </button>
                    <button
                      onClick={() => handleStatusChange(res.id, res.customerId, 'cancelled')}
                      className="flex-1 bg-gray-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-3">
                    상태: {getStatusLabel(res.status)}
                  </p>
                )}

                {res.memo && (
                  <p className="text-sm text-gray-600 mt-2">{res.memo}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Reservations
