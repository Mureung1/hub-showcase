import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getCustomer } from '@/services/customers'
import { createIncidentAndRefresh, transitionReservationStatusAndRefresh } from '@/services/riskRefresh'
import { listIncidents } from '@/services/incidents'
import { listReservations } from '@/services/reservations'
import { useAuthState } from '@/hooks/useAuth'
import type { Incident, CustomerSearchResult, FirestoreTimestamp } from '@/types/schema'
import RiskBadge from '@/components/RiskBadge'
import RiskAlertBanner from '@/components/RiskAlertBanner'
import IncidentModal from '@/components/IncidentModal'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'

function toDateString(value: FirestoreTimestamp): string {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const ts = value as { toDate: () => Date }
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toISOString().split('T')[0]
    }
  }
  return new Date(value as unknown as Date).toISOString().split('T')[0]
}

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface TimelineEvent {
  id: string
  date: string
  type: string
  icon: string
  memo?: string
}

const CustomerDetail = () => {
  const { id } = useParams()
  const { user } = useAuthState()
  const [customer, setCustomer] = useState<CustomerSearchResult | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getIncidentTypeLabel = (type: Incident['type']): string => {
    const labels: Record<Incident['type'], string> = {
      abuse: '폭언·무례',
      dispute: '환불·결제 분쟁',
      late: '상습 지각',
      unreasonable: '무리한 요구',
    }
    return labels[type]
  }

  const loadTimeline = useCallback(async (customerId: string) => {
    if (!user) return
    const [incidentsData, reservationsData] = await Promise.all([
      listIncidents(user.uid, customerId),
      listReservations(user.uid, customerId),
    ])

    const events: TimelineEvent[] = [
      ...reservationsData.map((res) => ({
        id: res.id,
        date: res.date,
        type: `예약 ${res.status}`,
        icon: 'calendar',
        memo: res.memo,
      })),
      ...incidentsData.map((inc) => ({
        id: `${inc.type}-${toDateString(inc.occurredAt)}`,
        date: toDateString(inc.occurredAt),
        type: getIncidentTypeLabel(inc.type),
        icon: 'warning',
        memo: inc.memo,
      })),
    ]
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setTimeline(events)
  }, [user])

  useEffect(() => {
    const loadData = async () => {
      if (!user || !id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const customerData = await getCustomer(user.uid, id)
        if (!customerData) {
          setCustomer(null)
          setIsLoading(false)
          return
        }
        setCustomer(customerData)
        await loadTimeline(id)
      } catch (err) {
        console.error('Failed to load customer data:', err)
        setError('고객 정보를 불러오는데 실패했습니다')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user, id, loadTimeline])

  const handleIncidentSubmit = async (data: { type: Incident['type']; memo: string; occurredAt: string }) => {
    if (!user || !id) return

    const incidentId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await createIncidentAndRefresh(user.uid, id, incidentId, {
      type: data.type,
      memo: data.memo,
      occurredAt: new Date(data.occurredAt),
    })

    const updatedCustomer = await getCustomer(user.uid, id)
    setCustomer(updatedCustomer)
    await loadTimeline(id)
    toast.success('사건 기록이 저장되었습니다')
  }

  const handleStatusChange = async (nextStatus: 'visited' | 'noShow' | 'cancelled') => {
    if (!user || !id || !customer) return

    try {
      // 오늘 활성 예약을 우선하고, 없으면 가장 최근 예약을 대상으로 한다.
      const reservations = await listReservations(user.uid, id)
      const todayStr = getLocalDateString()
      const target = reservations.find(
        (r) => r.date === todayStr && (r.status === 'pending' || r.status === 'confirmed'),
      ) ?? reservations.find((r) => r.status === 'pending' || r.status === 'confirmed')
        ?? reservations[0]

      if (!target) {
        toast.info('상태를 변경할 예약이 없습니다')
        return
      }

      await transitionReservationStatusAndRefresh(user.uid, id, target.id, nextStatus)
      const updatedCustomer = await getCustomer(user.uid, id)
      setCustomer(updatedCustomer)
      await loadTimeline(id)
      toast.success(`상태가 변경되었습니다: ${nextStatus}`)
    } catch (error) {
      toast.error('상태 변경 실패: ' + (error as Error).message)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-blue-600 hover:underline font-medium"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>고객을 찾을 수 없습니다</p>
      </div>
    )
  }

  const showAlert =
    customer.riskStats.noShowCount >= 3 ||
    customer.riskStats.incidentCounts.abuse >= 1

  return (
    <div className="p-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <RiskBadge score={customer.riskStats.score} />
        </div>
        <p className="text-gray-600">{customer.phoneMasked ?? '****-****'}</p>
        {showAlert && (
          <div className="mt-3">
            <RiskAlertBanner
              noShowCount={customer.riskStats.noShowCount}
              incidentCounts={customer.riskStats.incidentCounts}
            />
          </div>
        )}
      </div>

      {/* Timeline */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">이벤트 타임라인</h2>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsIncidentModalOpen(true)}
          >
            + 사건 기록
          </Button>
        </div>
        <div className="space-y-3">
          {timeline.length === 0 ? (
            <p className="text-center text-gray-500 py-4">등록된 이벤트가 없습니다</p>
          ) : (
            timeline.map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className="text-sm text-gray-500 w-16 flex-shrink-0">
                  {event.date}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">
                      {event.icon === 'warning' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9 16H3L12 3z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      )}
                    </span>
                    <span className="font-medium text-gray-900">{event.type}</span>
                  </div>
                  {event.memo && (
                    <p className="text-sm text-gray-600 mt-1">{event.memo}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleStatusChange('visited')}
          className="bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            방문
          </span>
        </button>
        <button
          onClick={() => handleStatusChange('noShow')}
          className="bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            노쇼
          </span>
        </button>
        <button
          onClick={() => handleStatusChange('cancelled')}
          className="bg-yellow-500 text-white py-3 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
        >
          당일취소
        </button>
      </div>

      {/* Incident Modal */}
      <IncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        onSubmit={handleIncidentSubmit}
      />
    </div>
  )
}

export default CustomerDetail
