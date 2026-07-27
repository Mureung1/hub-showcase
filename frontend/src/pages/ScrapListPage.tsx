import { useEffect, useState } from 'react'
import { scrapsApi, calendarEventsApi, calendarApi, Posting } from '../utils/apiClient'
import PostingCard from '../components/PostingCard'

interface ScrapListPageProps {
  setCurrentPage?: (page: 'auth' | 'profile' | 'dashboard' | 'calendar' | 'scraps' | 'settings' | 'github') => void
}

export default function ScrapListPage({ setCurrentPage }: ScrapListPageProps) {
  const [scraps, setScraps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [sortBy, setSortBy] = useState<'dday' | 'date'>('dday')
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])

  const limit = 12

  const fetchScraps = async (page: number, sort: 'dday' | 'date') => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await scrapsApi.list(limit, page * limit, sort)
      console.log('스크랩 응답:', response)
      if (response?.data) {
        setScraps(response.data.scraps || [])
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError('응답 데이터 형식이 올바르지 않습니다')
      }
    } catch (err: any) {
      console.error('스크랩 조회 실패:', err)
      setError(err.message || '스크랩을 불러올 수 없습니다')
      setScraps([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadCalendarEvents = async () => {
    try {
      const response = await calendarEventsApi.list()
      if (response?.data) {
        setCalendarEvents(response.data)
      }
    } catch (error) {
      console.error('캘린더 일정 로드 실패:', error)
    }
  }

  const isPostingAddedToCalendar = (posting: Posting | any): boolean => {
    return calendarEvents.some(event =>
      event.type === 'POSTING' && event.relatedPostingId === posting.id
    )
  }

  const handleAddToCalendar = async (posting: Posting | any) => {
    try {
      const endDate = new Date(posting.receptionEndDate)

      // 마감일 검증: 오늘 이후인지 확인
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)

      const isPast = endDate < today
      console.log('📅 마감일 검증:', {
        posting: posting.title,
        deadline: endDate.toISOString().split('T')[0],
        today: today.toISOString().split('T')[0],
        isPast
      })

      // 1. 로컬 DB에 저장 (링크 포함)
      await calendarEventsApi.create({
        title: `[마감] ${posting.title}`,
        type: 'POSTING',
        dtstart: endDate.toISOString(),
        dtend: endDate.toISOString(),
        relatedPostingId: posting.id,
        isAllDay: true,
        memo: posting.sourceUrl ? `링크: ${posting.sourceUrl}` : '',
      })

      // 2. Google Calendar에 동기화 (오늘 이후인 경우만)
      if (!isPast) {
        try {
          await calendarApi.sync(posting.id)
          console.log('✅ Google Calendar 동기화 완료')
        } catch (syncError) {
          console.warn('⚠️ Google Calendar 동기화 실패 (로컬 저장은 완료):', syncError)
        }
      } else {
        console.log('⏰ 마감일이 과거이므로 Google Calendar 동기화 스킵')
      }

      await loadCalendarEvents()
      setCurrentPage?.('calendar')
    } catch (error) {
      console.error('캘린더에 일정 추가 실패:', error)
      alert('캘린더에 일정을 추가할 수 없습니다')
    }
  }

  const handleDeleteFromCalendar = async (posting: Posting | any) => {
    try {
      const event = calendarEvents.find(e =>
        e.type === 'POSTING' && e.relatedPostingId === posting.id
      )
      if (!event) {
        alert('캘린더에서 해당 일정을 찾을 수 없습니다')
        return
      }

      await calendarEventsApi.delete(event.id)
      await loadCalendarEvents()
    } catch (error) {
      console.error('캘린더 일정 삭제 실패:', error)
      alert('캘린더 일정을 삭제할 수 없습니다')
    }
  }

  useEffect(() => {
    fetchScraps(offset / limit, sortBy)
    loadCalendarEvents()
  }, [offset, sortBy])

  const currentPage = Math.floor(offset / limit)
  const totalPages = Math.ceil(total / limit)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
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
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px 20px' }}>
          <div style={{ width: '28px', height: '28px', backgroundColor: '#111', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>U</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>UniBoard</span>
        </div>

        {/* 네비게이션 */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            { label: '대시보드', page: 'dashboard' as const },
            { label: '내 스크랩', page: 'scraps' as const },
            { label: '캘린더', page: 'calendar' as const },
            { label: 'GitHub 저장소', page: 'github' as const },
            { label: '환경설정', page: 'settings' as const },
          ].map((item, i) => {
            const isActive = item.page === 'scraps'
            return (
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
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? '#f5f5f5' : 'transparent',
                  transition: 'all 100ms',
                }}>
                <span>{item.label}</span>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
        {/* 헤더 */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
              ♡ 내 스크랩
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              스크랩한 공고 {total}개
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* 정렬 옵션 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={() => {
              setSortBy('dday')
              setOffset(0)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: sortBy === 'dday' ? 'none' : '1px solid #e5e7eb',
              backgroundColor: sortBy === 'dday' ? '#6366f1' : '#fff',
              color: sortBy === 'dday' ? '#fff' : '#6b7280',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 120ms',
            }}
          >
            ⏰ D-Day순
          </button>
          <button
            onClick={() => {
              setSortBy('date')
              setOffset(0)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: sortBy === 'date' ? 'none' : '1px solid #e5e7eb',
              backgroundColor: sortBy === 'date' ? '#6366f1' : '#fff',
              color: sortBy === 'date' ? '#fff' : '#6b7280',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 120ms',
            }}
          >
            📅 스크랩순
          </button>
          </div>

          {/* 에러 표시 */}
          {error && (
          <div
            style={{
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading ? (
          <div style={{ textAlign: 'center', paddingY: '48px' }}>
            <div
              style={{
                display: 'inline-block',
                animation: 'spin 1s linear infinite',
                width: '48px',
                height: '48px',
                border: '2px solid #6366f1',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
              }}
            ></div>
            <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '13px' }}>
              스크랩을 불러오는 중...
            </p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : scraps.length > 0 ? (
          <>
            {/* 공고 그리드 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '14px',
                marginBottom: '32px',
              }}
            >
              {scraps.map(scrap => (
                <div key={scrap.scrapId}>
                  <PostingCard
                    posting={scrap}
                    onScrapChange={() => {
                      fetchScraps(currentPage, sortBy)
                    }}
                    onAddToCalendar={handleAddToCalendar}
                    isAddedToCalendar={isPostingAddedToCalendar(scrap)}
                    onDeleteFromCalendar={handleDeleteFromCalendar}
                  />
                  {/* D-Day 배지 */}
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      backgroundColor:
                        scrap.dDay <= 0
                          ? '#fee2e2'
                          : scrap.dDay <= 3
                            ? '#fef3c7'
                            : '#f3f4f6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color:
                        scrap.dDay <= 0
                          ? '#ef4444'
                          : scrap.dDay <= 3
                            ? '#d97706'
                            : '#6b7280',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      {scrap.dDay > 0 ? `D-${scrap.dDay}` : scrap.dDay === 0 ? '오늘 마감' : '마감됨'}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await scrapsApi.updateNotify(scrap.scrapId, !scrap.notifyEnabled)
                          fetchScraps(currentPage, sortBy)
                        } catch (err) {
                          console.error('알림 설정 실패:', err)
                        }
                      }}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: scrap.notifyEnabled ? '#6366f1' : '#e5e7eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {scrap.notifyEnabled ? '🔔' : '🔕'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#fff',
                  cursor: offset === 0 ? 'not-allowed' : 'pointer',
                  opacity: offset === 0 ? 0.5 : 1,
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 120ms',
                }}
              >
                이전
              </button>

              {Array.from({ length: 5 }).map((_, i) => {
                const groupStart = Math.floor(currentPage / 5) * 5
                const pageNum = groupStart + i
                if (pageNum >= totalPages) return null

                return (
                  <button
                    key={pageNum}
                    onClick={() => setOffset(pageNum * limit)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      border: currentPage === pageNum ? 'none' : '1px solid #e5e7eb',
                      backgroundColor: currentPage === pageNum ? '#6366f1' : '#fff',
                      color: currentPage === pageNum ? '#fff' : '#111',
                      cursor: 'pointer',
                      transition: 'all 120ms',
                    }}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}

              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#fff',
                  cursor: offset + limit >= total ? 'not-allowed' : 'pointer',
                  opacity: offset + limit >= total ? 0.5 : 1,
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 120ms',
                }}
              >
                다음
              </button>
            </div>

            {/* 통계 */}
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
              총 {total}개의 스크랩 중 {offset + scraps.length}개 표시
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', paddingY: '48px' }}>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '13px' }}>
              스크랩한 공고가 없습니다
            </p>
            <button
              onClick={() => setCurrentPage?.('dashboard')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#6366f1',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 120ms',
              }}
            >
              공고 보기
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
