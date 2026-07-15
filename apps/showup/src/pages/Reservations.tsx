import { useState, useEffect } from 'react'
import { useAuthState } from '@/hooks/useAuth'
import { listTodayReservations, transitionReservationStatus } from '@/services/reservations'
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

  useEffect(() => {
    const loadTodayReservations = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const todayReservations = await listTodayReservations(user.uid)
        
        // 고객 정보 함께 로드
        const enriched = await Promise.all(
          todayReservations.map(async (res) => {
            const customer = await getCustomer(user.uid, res.customerId)
            return {
              ...res,
              id: res.customerId, // 임시 ID
              customerName: customer?.name || '알 수 없음',
              customerPhoneMasked: customer?.phone ? `010-****-${customer.phone.slice(-4)}` : '****-****',
            } as ReservationWithCustomer
          })
        )

        setReservations(enriched)
      } catch (error) {
        console.error('Failed to load reservations:', error)
        setReservations([])
      } finally {
        setIsLoading(false)
      }
    }

    loadTodayReservations()
  }, [user])

  const handleStatusChange = async (resId: string, nextStatus: Reservation['status']) => {
    if (!user) return

    try {
      await transitionReservationStatus(user.uid, resId, nextStatus)
      toast.success(`상태가 변경되었습니다: ${nextStatus}`)
      
      // 목록 새로고침
      const todayReservations = await listTodayReservations(user.uid)
      const enriched = await Promise.all(
        todayReservations.map(async (res) => {
          const customer = await getCustomer(user.uid, res.customerId)
          return {
            ...res,
            id: res.customerId,
            customerName: customer?.name || '알 수 없음',
            customerPhoneMasked: customer?.phone ? `010-****-${customer.phone.slice(-4)}` : '****-****',
          } as ReservationWithCustomer
        })
      )
      setReservations(enriched)
    } catch (error) {
      toast.error('상태 변경 실패: ' + (error as Error).message)
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
      default:
        return 'bg-blue-100 text-blue-800'
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

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">예약 관리</h1>
        <p className="text-sm text-gray-500 mt-1">오늘의 예약을 확인하고 상태를 기록하세요</p>
      </header>

      {/* Today's reservations */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">오늘의 예약</h2>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p>로딩 중...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>오늘 예약이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((res) => (
              <div key={res.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{res.customerName}</p>
                    <p className="text-sm text-gray-500">{res.customerPhoneMasked}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{res.time}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(res.status)}`}>
                      {getStatusLabel(res.status)}
                    </span>
                  </div>
                </div>
                
                {/* Status action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleStatusChange(res.id, 'visited')}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    disabled={res.status === 'visited'}
                  >
                    방문 ✅
                  </button>
                  <button
                    onClick={() => handleStatusChange(res.id, 'noShow')}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    disabled={res.status === 'noShow'}
                  >
                    노쇼 ❌
                  </button>
                  <button
                    onClick={() => handleStatusChange(res.id, 'cancelled')}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                    disabled={res.status === 'cancelled'}
                  >
                    취소
                  </button>
                </div>

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
