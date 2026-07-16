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
  type: 'EXAM' | 'PART_TIME' | 'POSTING' | 'OTHER'
  source: 'manual' | 'scrap-sync'
  backgroundColor?: string
  borderColor?: string
  isAllDay?: boolean
  startTime?: string
  endTime?: string
  memo?: string
  hideFromRecommendation?: boolean
}

interface ModalState {
  isOpen: boolean
  mode: 'add' | 'edit' | 'select'
  startDate?: Date
  endDate?: Date
  event?: CalendarEvent
  overlappingEvents?: CalendarEvent[]
}

const EVENT_COLORS = {
  EXAM: { bg: '#fef3c7', text: '#d97706', border: '#f59e0b' },
  PART_TIME: { bg: '#dbeafe', text: '#2563eb', border: '#3b82f6' },
  POSTING: { bg: '#fbcfe8', text: '#ec4899', border: '#f472b6' },
  OTHER: { bg: '#e5e7eb', text: '#374151', border: '#9ca3af' },
}

interface CalendarPageProps {
  setCurrentPage?: (page: 'auth' | 'profile' | 'dashboard' | 'calendar' | 'scraps' | 'settings') => void
}

export default function CalendarPage({ setCurrentPage }: CalendarPageProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [postings, setPostings] = useState<Posting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'add' })
  const [selectedRange, setSelectedRange] = useState<{ start?: Date; end?: Date }>({})

  useEffect(() => {
    loadEvents()
    loadPostings()
  }, [])

  const loadEvents = async () => {
    try {
      const response = await calendarEventsApi.list()
      if (response?.data) {
        const formattedEvents = response.data.map((evt: any) => {
          // DB는 UTC 기준 저장 (예: 2026-07-15T00:00:00.000Z)
          // → 로컬 시간으로 파싱해서 FullCalendar용으로 변환
          const startDate = new Date(evt.dtstart)
          const endDate = new Date(evt.dtend)

          // FullCalendar용: 로컬 시간 기준 ISO 문자열 (Z 없이)
          // 예: 2026-07-15T09:00:00 (타임존 정보 없음 = 로컬 시간)
          const toLocalISOString = (date: Date): string => {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hour = String(date.getHours()).padStart(2, '0')
            const minute = String(date.getMinutes()).padStart(2, '0')
            const second = String(date.getSeconds()).padStart(2, '0')
            return `${year}-${month}-${day}T${hour}:${minute}:${second}`
          }

          const startDateStr = startDate.toISOString().split('T')[0]
          const endDateStr = endDate.toISOString().split('T')[0]

          console.log(`📦 [${evt.title}] 이벤트 변환:`, {
            dbDtstart: evt.dtstart,
            dbDtend: evt.dtend,
            parsedStart: startDate.toString(),
            parsedEnd: endDate.toString(),
            startDateStr,
            endDateStr,
            isAllDay: evt.isAllDay,
            'start 로컬시간': startDate.toLocaleString('ko-KR'),
            'end 로컬시간': endDate.toLocaleString('ko-KR'),
          })

          // ⚠️ 시간 기반 일정이 여러 날에 걸쳐있으면 시작 날로 정정
          let finalStart: string
          let finalEnd: string

          if (!evt.isAllDay && startDateStr !== endDateStr) {
            console.warn('⚠️ 시간 기반 일정이 여러 날에 걸쳐있음:', {
              title: evt.title,
              startDateStr,
              endDateStr,
              설명: '시간 기반 일정은 같은 날에만 가능 → 시작 날짜로 정정',
            })
            // 시작 날의 00:00부터 23:59까지로 정정
            const correctedStart = new Date(startDate)
            correctedStart.setHours(0, 0, 0, 0)
            const correctedEnd = new Date(startDate)
            correctedEnd.setHours(23, 59, 59, 999)
            finalStart = toLocalISOString(correctedStart)
            finalEnd = toLocalISOString(correctedEnd)
          } else {
            // FullCalendar용: Z 제거 (로컬 시간 기준으로 인식하도록)
            finalStart = toLocalISOString(startDate)
            finalEnd = toLocalISOString(endDate)
          }

          // 24시간 형식 시간: "09:00 ~ 18:00"
          const formatTime = (date: Date): string => {
            const hour = String(date.getHours()).padStart(2, '0')
            const minute = String(date.getMinutes()).padStart(2, '0')
            return `${hour}:${minute}`
          }

          const timeLabel = evt.isAllDay
            ? ''
            : `${formatTime(startDate)} ~ ${formatTime(endDate)}`

          // 시간을 앞에 배치: "09:00 ~ 18:00 rrr"
          const displayTitle = evt.isAllDay ? evt.title : `${timeLabel} ${evt.title}`

          console.log(`✅ [${evt.title}] 최종 타이틀:`, displayTitle)
          console.log(`  FullCalendar용 범위: ${finalStart} ~ ${finalEnd}`)

          return {
            ...evt,
            start: finalStart,
            end: finalEnd,
            originalTitle: evt.title,
            title: displayTitle,
            allDay: evt.isAllDay,
            backgroundColor: EVENT_COLORS[evt.type as keyof typeof EVENT_COLORS].bg,
            borderColor: EVENT_COLORS[evt.type as keyof typeof EVENT_COLORS].border,
            textColor: EVENT_COLORS[evt.type as keyof typeof EVENT_COLORS].text,
          }
        })
        console.log('✅ 변환 완료:', formattedEvents.length, '개 이벤트')
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
    console.log('📍 날짜 선택 원본:', { startStr: info.startStr, endStr: info.endStr })
    // 날짜 범위 선택만 수행 (팝업 안 띄움)
    try {
      const startStr = info.startStr || info.start
      const endStr = info.endStr || info.end

      if (!startStr) {
        console.warn('⚠️ startStr 없음')
        return
      }

      // YYYY-MM-DD 형식 추출
      const startDateStr = typeof startStr === 'string' ? startStr.split('T')[0] : startStr
      let endDateStr = typeof endStr === 'string' ? endStr.split('T')[0] : endStr

      // 문자열 "YYYY-MM-DD"를 Date로 안전하게 변환 (로컬 시간)
      const [year, month, day] = startDateStr.split('-').map(Number)
      const startDate = new Date(year, month - 1, day, 0, 0, 0)

      // FullCalendar는 endStr을 "범위 끝의 다음날"로 설정하므로, 1일 빼기
      let endDate = startDate
      if (endDateStr && endDateStr !== startDateStr) {
        const [eyear, emonth, eday] = endDateStr.split('-').map(Number)
        let tempEndDate = new Date(eyear, emonth - 1, eday, 0, 0, 0)
        // 1일 빼기 (FullCalendar의 배타적 끝 처리)
        tempEndDate.setDate(tempEndDate.getDate() - 1)
        endDate = tempEndDate
      }

      if (!isNaN(startDate.getTime())) {
        console.log('✅ 조정된 선택:', startDate, '~', endDate)
        setSelectedRange({ start: startDate, end: endDate })
      }
    } catch (error) {
      console.error('❌ 날짜 선택 오류:', error)
    }
  }

  const handleEventClick = (info: any) => {
    if (info.event.extendedProps.source === 'scrap-sync') {
      const posting = postings.find(p => p.id === info.event.id.replace('posting-', ''))
      if (posting) {
        window.open(posting.sourceUrl, '_blank')
      }
    } else {
      // 개인 일정 수정 모드로 열기
      const event = events.find(e => e.id === info.event.id)
      if (event) {
        setModal({
          isOpen: true,
          mode: 'edit',
          event: {
            ...event,
            title: event.originalTitle, // ← 원본 제목 복구
          },
        })
      }
    }
  }

  const handleOpenAddModal = () => {
    if (!selectedRange.start) {
      alert('날짜를 먼저 선택해주세요')
      return
    }
    setModal({
      isOpen: true,
      mode: 'add',
      startDate: selectedRange.start,
      endDate: selectedRange.end || selectedRange.start,
    })
  }

  // 두 날짜 범위가 겹치는지 판단
  const isOverlapping = (
    event1Start: Date,
    event1End: Date,
    event2Start: Date,
    event2End: Date
  ): boolean => {
    return event1Start <= event2End && event2Start <= event1End
  }

  const handleOpenEditModal = () => {
    if (!selectedRange.start) {
      alert('수정할 날짜 범위를 먼저 선택해주세요')
      return
    }

    // 선택된 날짜 범위와 겹치는 모든 일정 찾기
    const overlappingEvents = events.filter(e => {
      const eventStart = new Date(e.start)
      const eventEnd = new Date(e.end)
      const rangeEnd = selectedRange.end || selectedRange.start!

      return isOverlapping(eventStart, eventEnd, selectedRange.start!, rangeEnd)
    })

    if (overlappingEvents.length === 0) {
      alert('선택된 범위에 겹치는 일정이 없습니다')
      return
    }

    // 일정이 1개면 바로 수정 모달, 여러 개면 선택 모달
    if (overlappingEvents.length === 1) {
      setModal({
        isOpen: true,
        mode: 'edit',
        event: overlappingEvents[0],
      })
    } else {
      setModal({
        isOpen: true,
        mode: 'select',
        overlappingEvents,
      })
    }
  }

  const handleSaveEvent = async (eventData: any) => {
    try {
      if (modal.mode === 'add') {
        await calendarEventsApi.create({
          title: eventData.title,
          type: eventData.type,
          dtstart: eventData.dtstart,
          dtend: eventData.dtend,
          isAllDay: eventData.isAllDay,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          memo: eventData.memo,
          hideFromRecommendation: eventData.hideFromRecommendation,
        })
      } else if (modal.mode === 'edit' && modal.event) {
        await calendarEventsApi.update(modal.event.id, {
          title: eventData.title,
          type: eventData.type,
          dtstart: eventData.dtstart,
          dtend: eventData.dtend,
          isAllDay: eventData.isAllDay,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          memo: eventData.memo,
          hideFromRecommendation: eventData.hideFromRecommendation,
        })
      }
      loadEvents()
      setModal({ isOpen: false, mode: 'add' })
      setSelectedRange({})
    } catch (error) {
      console.error('일정 저장 실패:', error)
    }
  }

  const handleDeleteEvent = async () => {
    if (!modal.event?.id) return
    if (!confirm('이 일정을 삭제하시겠습니까?')) return

    try {
      await calendarEventsApi.delete(modal.event.id)
      loadEvents()
      setModal({ isOpen: false, mode: 'add' })
      setSelectedRange({})
    } catch (error) {
      console.error('일정 삭제 실패:', error)
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
            { label: '♡ 내 스크랩', page: 'scraps' as const },
            { label: '📅 캘린더', page: 'calendar' as const },
            { label: '⚙ 환경설정', page: 'settings' as const },
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

        <div style={{ marginTop: 'auto', fontSize: '12px', color: '#374151', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontWeight: 700, marginBottom: '10px', color: '#111' }}>범례</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', backgroundColor: '#fcd34d', borderRadius: '3px' }}></div>
              <span style={{ fontWeight: 500 }}>시험 기간</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', backgroundColor: '#60a5fa', borderRadius: '3px' }}></div>
              <span style={{ fontWeight: 500 }}>알바/파트타임</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', backgroundColor: '#ec4899', borderRadius: '3px' }}></div>
              <span style={{ fontWeight: 500 }}>공고 마감일</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', backgroundColor: '#9ca3af', borderRadius: '3px' }}></div>
              <span style={{ fontWeight: 500 }}>기타 일정</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 메인 캘린더 영역 */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 상단 헤더 + 버튼 */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111', marginBottom: '12px' }}>📅 나의 일정</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>시험, 알바, 공고 마감일을 한눈에 관리하세요</p>

          {/* 버튼 그룹 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleOpenAddModal}
              disabled={!selectedRange.start}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedRange.start ? '#6366f1' : '#d1d5db',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: selectedRange.start ? 'pointer' : 'not-allowed',
                transition: 'background-color 150ms',
              }}>
              ➕ 추가
            </button>

            <button
              onClick={handleOpenEditModal}
              disabled={!selectedRange.start}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedRange.start ? '#10b981' : '#d1d5db',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: selectedRange.start ? 'pointer' : 'not-allowed',
                transition: 'background-color 150ms',
              }}>
              ✏️ 수정
            </button>

            {selectedRange.start && (
              <button
                onClick={() => setSelectedRange({})}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#111',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 150ms',
                }}>
                ❌ 초기화
              </button>
            )}

            {selectedRange.start && (
              <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280', padding: '8px 12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                {selectedRange.start.toLocaleDateString('ko-KR')} {selectedRange.end && selectedRange.end.getTime() !== selectedRange.start.getTime() && `~ ${selectedRange.end.toLocaleDateString('ko-KR')}`} 선택됨
              </div>
            )}
          </div>
        </div>

        {/* 캘린더 */}
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
                eventDisplay="block"
                eventContent={(arg) => {
                  const container = document.createElement('div')
                  container.style.display = 'flex'
                  container.style.alignItems = 'center'
                  container.style.gap = '4px'
                  container.style.width = '100%'

                  // 색상 점
                  const dot = document.createElement('div')
                  dot.style.width = '8px'
                  dot.style.height = '8px'
                  dot.style.borderRadius = '50%'
                  dot.style.backgroundColor = arg.event.backgroundColor || '#ccc'
                  dot.style.flexShrink = '0'
                  container.appendChild(dot)

                  // 제목
                  const title = document.createElement('div')
                  title.style.fontSize = '13px'
                  title.style.fontWeight = '500'
                  title.style.whiteSpace = 'nowrap'
                  title.style.overflow = 'hidden'
                  title.style.textOverflow = 'ellipsis'
                  title.textContent = arg.event.title
                  container.appendChild(title)

                  return { domNodes: [container] }
                }}
                selectable={true}
                selectLongPressDelay={0}
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
        mode={modal.mode}
        date={modal.startDate}
        endDate={modal.endDate}
        event={modal.event}
        overlappingEvents={modal.overlappingEvents}
        onClose={() => setModal({ isOpen: false, mode: 'add' })}
        onSelectEvent={(selectedEvent) => {
          // 겹치는 일정 중 하나를 선택하면 수정 모달로 전환
          setModal({
            isOpen: true,
            mode: 'edit',
            event: selectedEvent,
          })
        }}
        onSave={handleSaveEvent}
        onDelete={modal.mode === 'edit' ? handleDeleteEvent : undefined}
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
