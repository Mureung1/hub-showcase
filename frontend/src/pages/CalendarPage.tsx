import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { postingsApi, calendarEventsApi, Posting } from '../utils/apiClient'
import EventModal from '../components/EventModal'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  type: 'EXAM' | 'PART_TIME' | 'OTHER'
  source: 'manual' | 'scrap-sync'
  backgroundColor?: string
  borderColor?: string
}

interface ModalState {
  isOpen: boolean
  date?: Date
  event?: CalendarEvent
}

const EVENT_COLORS = {
  EXAM: { bg: '#fef3c7', text: '#d97706', border: '#f59e0b' },
  PART_TIME: { bg: '#dbeafe', text: '#2563eb', border: '#3b82f6' },
  OTHER: { bg: '#e5e7eb', text: '#374151', border: '#9ca3af' },
}

interface CalendarPageProps {
  setCurrentPage?: (page: 'auth' | 'profile' | 'dashboard' | 'calendar') => void
}

export default function CalendarPage({ setCurrentPage }: CalendarPageProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [postings, setPostings] = useState<Posting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>({ isOpen: false })

  useEffect(() => {
    loadEvents()
    loadPostings()
  }, [])

  const loadEvents = async () => {
    try {
      const response = await calendarEventsApi.list()
      if (response?.data) {
        const formattedEvents = response.data.map((evt: any) => ({
          ...evt,
          start: evt.dtstart,
          end: evt.dtend,
          backgroundColor: EVENT_COLORS[evt.type as keyof typeof EVENT_COLORS].bg,
          borderColor: EVENT_COLORS[evt.type as keyof typeof EVENT_COLORS].border,
          textColor: EVENT_COLORS[evt.type as keyof typeof EVENT_COLORS].text,
        }))
        setEvents(formattedEvents)
      }
    } catch (error) {
      console.error('일정 로드 실패:', error)
    }
  }

  const loadPostings = async () => {
    try {
      const response = await postingsApi.list(100, 0, 'all')
      if (response?.data?.postings) {
        setPostings(response.data.postings)
      }
    } catch (error) {
      console.error('공고 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPostingEvents = () => {
    return postings
      .filter(p => p.receptionEndDate)
      .map(p => ({
        id: `posting-${p.id}`,
        title: `📌 ${p.title}`,
        start: p.receptionEndDate,
        end: p.receptionEndDate,
        source: 'scrap-sync' as const,
        extendedProps: {
          category: p.category,
          sourceUrl: p.sourceUrl,
        },
        backgroundColor: '#fecaca',
        borderColor: '#ef4444',
        textColor: '#991b1b',
        display: 'background',
      }))
    }

  const allEvents = [...events, ...getPostingEvents()]

  const handleDateSelect = (info: any) => {
    setModal({
      isOpen: true,
      date: new Date(info.dateStr),
    })
  }

  const handleEventClick = (info: any) => {
    if (info.event.extendedProps.source === 'scrap-sync') {
      const posting = postings.find(p => p.id === info.event.id.replace('posting-', ''))
      if (posting) {
        window.open(posting.sourceUrl, '_blank')
      }
    }
  }

  const handleSaveEvent = async (eventData: any) => {
    try {
      await calendarEventsApi.create({
        title: eventData.title,
        type: eventData.type,
        dtstart: eventData.dtstart,
        dtend: eventData.dtend,
      })
      loadEvents()
      setModal({ isOpen: false })
    } catch (error) {
      console.error('일정 저장 실패:', error)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* 좌측 사이드바 */}
      <aside style={{
        width: '220px',
        minWidth: '220px',
        backgroundColor: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px 20px' }}>
          <div style={{ width: '28px', height: '28px', backgroundColor: '#111', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>U</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>UniBoard</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            { label: '⊞ 대시보드', page: 'dashboard' as const },
            { label: '♡ 내 스크랩', page: 'dashboard' as const },
            { label: '📅 캘린더', page: 'calendar' as const },
            { label: '⚙ 프로필 설정', page: 'dashboard' as const },
          ].map((item, i) => (
            <div
              key={i}
              onClick={() => setCurrentPage?.(item.page)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '9px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: i === 2 ? 600 : 500,
                backgroundColor: i === 2 ? '#f5f5f5' : 'transparent',
              }}>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', fontSize: '11px', color: '#9ca3af', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>범례</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#fef3c7', borderRadius: '2px' }}></div>
              <span>시험 기간</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#dbeafe', borderRadius: '2px' }}></div>
              <span>알바/파트타임</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#e5e7eb', borderRadius: '2px' }}></div>
              <span>기타 일정</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#fecaca', borderRadius: '2px' }}></div>
              <span>공고 마감일</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 메인 캘린더 영역 */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111' }}>📅 나의 일정</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>시험, 알바, 공고 마감일을 한눈에 관리하세요</p>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', padding: '20px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', paddingTop: '48px' }}>
              <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', width: '48px', height: '48px', border: '2px solid #6366f1', borderTop: '2px solid transparent', borderRadius: '50%' }}></div>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek',
                }}
                events={allEvents}
                select={handleDateSelect}
                eventClick={handleEventClick}
                selectable={true}
                locale="ko"
                height="100%"
                contentHeight="100%"
              />
            </div>
          )}
        </div>
      </main>

      {/* 모달 */}
      <EventModal
        isOpen={modal.isOpen}
        date={modal.date}
        onClose={() => setModal({ isOpen: false })}
        onSave={handleSaveEvent}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .fc {
          font-family: 'Inter', 'Pretendard', -apple-system, sans-serif;
          font-size: 13px;
          color: #111;
        }
        .fc button {
          background-color: transparent;
          border: 1px solid #e5e7eb;
          color: #111;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
        }
        .fc button:hover {
          background-color: #f8f9fa;
        }
        .fc button.fc-button-active {
          background-color: #6366f1;
          color: #fff;
          border-color: #6366f1;
        }
        .fc-col-header-cell {
          background-color: #f8f9fa;
          color: #374151;
          font-weight: 600;
          padding: 10px 0;
        }
        .fc-daygrid-day {
          border-color: #e5e7eb;
        }
        .fc-daygrid-day-number {
          padding: 8px;
          font-size: 13px;
        }
        .fc-event {
          border: none;
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 11px;
        }
        .fc-event-title {
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
