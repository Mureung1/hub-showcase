import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthState } from '@/hooks/useAuth'
import { getCustomer, refreshCustomerRiskStats } from '@/services/customers'
import { listIncidents, createIncident } from '@/services/incidents'
import { listReservations, transitionReservationStatus } from '@/services/reservations'
import type { Incident } from '@/types/schema'
import RiskBadge from '@/components/RiskBadge'
import RiskAlertBanner from '@/components/RiskAlertBanner'
import IncidentModal from '@/components/IncidentModal'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'

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
  const [customer, setCustomer] = useState<any | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!user || !id) return

      try {
        const customerData = await getCustomer(user.uid, id)
        setCustomer(customerData)

        const [incidentsData, reservationsData] = await Promise.all([
          listIncidents(user.uid, id),
          listReservations(user.uid, id),
        ])

        // 타임라인 병합
        const events: TimelineEvent[] = [
          ...reservationsData.map((res) => ({
            id: res.customerId,
            date: res.date,
            type: `예약 ${res.status}`,
            icon: '📅',
            memo: res.memo,
          })),
          ...incidentsData.map((inc) => ({
            id: inc.memo,
            date: new Date(inc.occurredAt as any).toISOString().split('T')[0],
            type: getIncidentTypeLabel(inc.type),
            icon: '⚠️',
            memo: inc.memo,
          })),
        ]

        // 날짜순 정렬
        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setTimeline(events)
      } catch (error) {
        console.error('Failed to load customer data:', error)
      }
    }

    loadData()
  }, [user, id])

  const getIncidentTypeLabel = (type: Incident['type']): string => {
    const labels: Record<Incident['type'], string> = {
      abuse: '폭언·무례',
      dispute: '환불·결제 분쟁',
      late: '상습 지각',
      unreasonable: '무리한 요구',
    }
    return labels[type]
  }

  const handleIncidentSubmit = async (data: { type: Incident['type']; memo: string; occurredAt: string }) => {
    if (!user || !id) return

    const incidentId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await createIncident(user.uid, id, incidentId, {
      type: data.type,
      memo: data.memo,
      occurredAt: new Date(data.occurredAt),
    })

    // riskStats 갱신
    const [incidentsData, reservationsData] = await Promise.all([
      listIncidents(user.uid, id),
      listReservations(user.uid, id),
    ])
    await refreshCustomerRiskStats(user.uid, id, reservationsData, incidentsData)

    // 데이터 새로고침
    const updatedCustomer = await getCustomer(user.uid, id)
    setCustomer(updatedCustomer)
    setIncidents(incidentsData)
    
    // 타임라인 업데이트
    const events: TimelineEvent[] = [
      ...reservationsData.map((res) => ({
        id: res.customerId,
        date: res.date,
        type: `예약 ${res.status}`,
        icon: '📅',
        memo: res.memo,
      })),
      ...incidentsData.map((inc) => ({
        id: inc.memo,
        date: new Date(inc.occurredAt as any).toISOString().split('T')[0],
        type: getIncidentTypeLabel(inc.type),
        icon: '⚠️',
        memo: inc.memo,
      })),
    ]
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setTimeline(events)
  }

  const handleStatusChange = async (nextStatus: 'visited' | 'noShow' | 'cancelled') => {
    if (!user || !id) return

    try {
      await transitionReservationStatus(user.uid, id, nextStatus)
      
      // riskStats 갱신
      const [incidentsData, reservationsData] = await Promise.all([
        listIncidents(user.uid, id),
        listReservations(user.uid, id),
      ])
      await refreshCustomerRiskStats(user.uid, id, reservationsData, incidentsData)

      // 고객 정보 새로고침
      const updatedCustomer = await getCustomer(user.uid, id)
      setCustomer(updatedCustomer)
      
      toast.success(`상태가 변경되었습니다: ${nextStatus}`)
    } catch (error) {
      toast.error('상태 변경 실패: ' + (error as Error).message)
    }
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
        <p className="text-gray-600">010-****-{customer.phoneLast4}</p>
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
                    <span className="text-lg">{event.icon}</span>
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
          방문 ✅
        </button>
        <button
          onClick={() => handleStatusChange('noShow')}
          className="bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          노쇼 ❌
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
