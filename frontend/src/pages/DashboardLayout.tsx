import { useEffect, useState } from 'react'
import { postingsApi, profileApi, calendarEventsApi, Posting } from '../utils/apiClient'
import PostingCard from '../components/PostingCard'
import { GoogleCalendarButton } from '../components/GoogleCalendarButton'

type Category = 'all' | 'COMPETITION' | 'ACTIVITY' | 'POLICY' | 'CAMPUS_EVENT'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'COMPETITION', label: '공모전' },
  { value: 'ACTIVITY', label: '대외활동' },
  { value: 'POLICY', label: '정책/지원금' },
  { value: 'CAMPUS_EVENT', label: '교내행사' },
]

interface DashboardLayoutProps {
  setCurrentPage?: (page: 'auth' | 'profile' | 'dashboard' | 'calendar' | 'scraps' | 'settings') => void
}

export default function DashboardLayout({ setCurrentPage }: DashboardLayoutProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [postings, setPostings] = useState<Posting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [profile, setProfile] = useState<any>(null)
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [eventsMap, setEventsMap] = useState<Map<number, any[]>>(new Map())
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[] | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [useSmartMatching, setUseSmartMatching] = useState(false)
  const [sortBy, setSortBy] = useState<'deadline' | 'matchScore'>('deadline')

  const limit = 12

  const loadProfile = async () => {
    try {
      console.log('📋 프로필 로드 시작...')
      const response = await profileApi.fetch()
      console.log('📋 프로필 API 응답:', response)

      // 백엔드가 직접 profile 객체를 반환 (ApiResponse 래핑 안 함)
      if (response?.id || response?.userId) {
        console.log('✅ 프로필 데이터:', response)
        setProfile(response)
      } else if (response?.data) {
        console.log('✅ 프로필 데이터 (ApiResponse):', response.data)
        setProfile(response.data)
      } else {
        console.warn('⚠️ 프로필 응답 형식 오류:', response)
      }
    } catch (err: any) {
      console.error('❌ 프로필 로드 실패:', err)
      console.error('에러 메시지:', err.message)

      // 인증 토큰이 없거나 만료됨
      if (err.message?.includes('인증') || err.message?.includes('토큰')) {
        console.log('인증 에러 감지, 로그인 페이지로 이동')
        setCurrentPage?.('auth')
      }
    }
  }

  const fetchPostings = async (category: Category, page: number, smart: boolean = false, sort: 'deadline' | 'matchScore' = 'deadline') => {
    setIsLoading(true)

    try {
      const response = await postingsApi.list(limit, page * limit, category, smart, sort)
      if (response?.data) {
        setPostings(response.data.postings || [])
        setTotal(response.data.pagination?.total || 0)
      }
    } catch (err: any) {
      console.error('공고 조회 실패:', err)
      setPostings([])
    } finally {
      setIsLoading(false)
    }
  }

  // 캘린더 이벤트 로드
  const loadCalendarEvents = async () => {
    try {
      const response = await calendarEventsApi.list()
      if (response?.data) {
        setCalendarEvents(response.data)

        // 날짜별 일정 매핑 (여러 날 일정도 모두 표시)
        const eventsByDay = new Map<number, any[]>()
        response.data.forEach((evt: any) => {
          const startDate = new Date(evt.dtstart)
          const endDate = new Date(evt.dtend)

          // 시작일부터 종료일까지 모든 날에 이벤트 추가
          const currentDate = new Date(startDate)
          while (currentDate <= endDate) {
            const day = currentDate.getDate()

            if (!eventsByDay.has(day)) {
              eventsByDay.set(day, [])
            }
            eventsByDay.get(day)!.push(evt)

            currentDate.setDate(currentDate.getDate() + 1)
          }
        })
        setEventsMap(eventsByDay)
      }
    } catch (error) {
      console.error('캘린더 일정 로드 실패:', error)
    }
  }

  const handleAddToCalendar = async (posting: Posting) => {
    try {
      const endDate = new Date(posting.receptionEndDate)
      await calendarEventsApi.create({
        title: `[마감] ${posting.title}`,
        type: 'POSTING',
        dtstart: endDate.toISOString(),
        dtend: endDate.toISOString(),
      })

      // 캘린더 다시 로드
      await loadCalendarEvents()

      // 캘린더 페이지로 이동
      setCurrentPage?.('calendar')
    } catch (error) {
      console.error('캘린더에 일정 추가 실패:', error)
      alert('캘린더에 일정을 추가할 수 없습니다')
    }
  }

  useEffect(() => {
    loadProfile()
    fetchPostings(selectedCategory, offset / limit, useSmartMatching, sortBy)
    loadCalendarEvents()
  }, [selectedCategory, offset, useSmartMatching, sortBy])

  const currentPage = Math.floor(offset / limit)
  const totalPages = Math.ceil(total / limit)

  // 달력 생성
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const calendarDays = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
      {/* ===== 좌측 사이드바 ===== */}
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

        {/* 프로필 박스 */}
        <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '12px', marginBottom: '20px' }}>
          {profile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                    {(profile as any).nickname?.charAt(0).toUpperCase() || profile.userId?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>
                    {(profile as any).nickname || profile.userId || '사용자'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.3 }}>{profile.major || '전공미정'} {profile.grade || ''}학년</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {profile.major && (
                  <span style={{ backgroundColor: '#ede9fe', color: '#6366f1', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px' }}>
                    {profile.major}
                  </span>
                )}
                {profile.grade && (
                  <span style={{ backgroundColor: '#f5f5f5', color: '#374151', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px' }}>
                    {profile.grade}학년
                  </span>
                )}
                {profile.residenceRegion && (
                  <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px' }}>
                    {profile.residenceRegion}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: '#6b7280', padding: '8px 0' }}>프로필을 불러오는 중...</div>
          )}
        </div>

        {/* 네비게이션 */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
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
                fontWeight: i === 0 ? 600 : 500,
                backgroundColor: i === 0 ? '#f5f5f5' : 'transparent',
                transition: 'all 100ms',
              }}>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* 스마트 추천 카드 - 7단계에서 활성화 */}
        <div style={{
          marginTop: '16px',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderLeft: '3px solid #d1d5db',
          borderRadius: '8px',
          padding: '12px',
          opacity: 0.6,
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', marginBottom: '4px' }}>✦ 스마트 추천 (준비 중)</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.4 }}>캘린더 일정을 등록하면 최적의 공고를 추천해드립니다.</div>
        </div>
      </aside>

      {/* ===== 메인 영역 ===== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 상단바 */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ flex: 1, maxWidth: '480px', position: 'relative' }}>
            <input
              type="text"
              placeholder="공고 검색 (예: 경남 지역, 이공계...)"
              style={{
                width: '100%',
                height: '38px',
                padding: '0 14px 0 36px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#111',
                backgroundColor: '#f8f9fa',
                outline: 'none',
              }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#9ca3af' }}>🔍</span>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>{profile?.userId?.charAt(0).toUpperCase() || '?'}</span>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 피드 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {/* 페이지 제목 */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111' }}>
                  {selectedCategory === 'all' ? '내 맞춤 공고' : CATEGORIES.find(c => c.value === selectedCategory)?.label}
                </h1>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>
                  프로필 기준 {total}개 공고 매칭됨 {profile?.residenceRegion && `· ${profile.residenceRegion}`} {profile?.major && `· ${profile.major}`}
                </p>
              </div>
              <button
                onClick={() => setUseSmartMatching(!useSmartMatching)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: useSmartMatching ? 'none' : '1px solid #e5e7eb',
                  backgroundColor: useSmartMatching ? '#6366f1' : '#fff',
                  color: useSmartMatching ? '#fff' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 120ms',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⏰</span>
                <span>시간 최적화</span>
              </button>
            </div>

            {/* 카테고리 탭 + 정렬 필터 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              {/* 카테고리 탭 */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setSelectedCategory(cat.value)
                      setOffset(0)
                    }}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '9999px',
                      fontSize: '13px',
                      fontWeight: selectedCategory === cat.value ? 600 : 500,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: selectedCategory === cat.value ? '#111' : 'transparent',
                      color: selectedCategory === cat.value ? '#fff' : '#6b7280',
                      transition: 'all 120ms',
                    }}
                  >
                    {cat.label} {cat.value === 'all' && `(${total})`}
                  </button>
                ))}
              </div>

              {/* 정렬 필터 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSortBy('deadline')}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: sortBy === 'deadline' ? 600 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: sortBy === 'deadline' ? '#111' : 'transparent',
                    color: sortBy === 'deadline' ? '#fff' : '#6b7280',
                    transition: 'all 120ms',
                    whiteSpace: 'nowrap',
                  }}
                >
                  📅 마감일 순
                </button>
                <button
                  onClick={() => setSortBy('matchScore')}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: sortBy === 'matchScore' ? 600 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: sortBy === 'matchScore' ? '#111' : 'transparent',
                    color: sortBy === 'matchScore' ? '#fff' : '#6b7280',
                    transition: 'all 120ms',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⭐ 매칭도 순
                </button>
              </div>
            </div>

            {/* 공고 그리드 */}
            {isLoading ? (
              <div style={{ textAlign: 'center', paddingTop: '48px' }}>
                <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', width: '48px', height: '48px', border: '2px solid #6366f1', borderTop: '2px solid transparent', borderRadius: '50%' }}></div>
                <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '13px' }}>공고를 불러오는 중...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : postings.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '14px', marginBottom: '32px' }}>
                  {postings.map(posting => (
                    <PostingCard
                      key={posting.id}
                      posting={posting}
                      onScrapChange={() => {
                        setPostings(prev =>
                          prev.map(p =>
                            p.id === posting.id ? { ...p, isScraped: !p.isScraped } : p
                          )
                        )
                      }}
                      onAddToCalendar={handleAddToCalendar}
                    />
                  ))}
                </div>

                {/* 페이지네이션 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fff', cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.5 : 1, fontSize: '13px', fontWeight: 500 }}
                  >
                    이전
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const pageNum = currentPage + i
                    if (pageNum >= totalPages) return null
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setOffset(pageNum * limit)}
                        style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: currentPage === pageNum ? 'none' : '1px solid #e5e7eb', backgroundColor: currentPage === pageNum ? '#6366f1' : '#fff', color: currentPage === pageNum ? '#fff' : '#111', cursor: 'pointer' }}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fff', cursor: offset + limit >= total ? 'not-allowed' : 'pointer', opacity: offset + limit >= total ? 0.5 : 1, fontSize: '13px', fontWeight: 500 }}
                  >
                    다음
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: '48px' }}>
                <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '13px' }}>해당하는 공고가 없습니다</p>
              </div>
            )}
          </div>

          {/* ===== 우측 패널 ===== */}
          <aside style={{ width: '272px', minWidth: '272px', borderLeft: '1px solid #e5e7eb', backgroundColor: '#fff', overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 미니 캘린더 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.2px' }}>
                  {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid #e5e7eb', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px' }}>‹</button>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid #e5e7eb', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px' }}>›</button>
                </div>
              </div>

              {/* 요일 헤더 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#9ca3af', padding: '3px 0' }}>{d}</div>
                ))}
              </div>

              {/* 캘린더 그리드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
                {calendarDays.map((day, i) => {
                  const isToday = day === today.getDate() && currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth()
                  const hasEvents = day && eventsMap.has(day)
                  const dayEvents = hasEvents ? eventsMap.get(day) : []

                  const EVENT_COLORS: { [key: string]: string } = {
                    EXAM: '#d97706',      // 더 진한 노랑 (주황)
                    PART_TIME: '#2563eb', // 더 진한 파랑
                    OTHER: '#6b7280',     // 더 진한 회색
                  }

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (hasEvents && dayEvents && dayEvents.length > 0) {
                          setSelectedDay(day)
                          setSelectedDayEvents(dayEvents)
                        }
                      }}
                      style={{
                        aspectRatio: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: day && hasEvents ? 'flex-start' : 'center',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: day ? (isToday ? '#fff' : '#111') : 'transparent',
                        backgroundColor: isToday ? '#111' : 'transparent',
                        cursor: hasEvents && day ? 'pointer' : 'default',
                        padding: '2px',
                        position: 'relative',
                        transition: 'background-color 150ms',
                      }}
                      onMouseEnter={(e) => {
                        if (hasEvents && day) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = isToday ? '#111' : '#f0f0f0'
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = isToday ? '#111' : 'transparent'
                      }}
                    >
                      <div>{day}</div>
                      {hasEvents && dayEvents && dayEvents.length > 0 && (
                        <div style={{ display: 'flex', gap: '2px', marginTop: '2px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                          {dayEvents.slice(0, 2).map((evt, idx) => (
                            <div
                              key={idx}
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: EVENT_COLORS[(evt.type as keyof typeof EVENT_COLORS)] || '#6b7280',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                              }}
                              title={evt.title}
                            ></div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: '#111',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                              }}
                              title={`${dayEvents.length}개 일정`}
                            ></div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Google Calendar 연동 */}
            {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <GoogleCalendarButton
                onSuccess={() => {
                  console.log('Google Calendar 연동 성공')
                }}
                onError={(error) => {
                  console.error('Google Calendar 연동 실패:', error)
                }}
              />
            )}

            {/* 구분선 */}
            <div style={{ height: '1px', backgroundColor: '#f3f4f6' }}></div>

            {/* 다음 마감 일정 */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '10px', letterSpacing: '-0.1px' }}>다음 마감 일정</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>2025 SW 해커톤</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>2025.07.14</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', flexShrink: 0 }}>D-5</span>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', fontWeight: 600, color: '#6366f1', cursor: 'pointer' }}>전체 보기 →</div>
            </div>

            {/* 구분선 */}
            <div style={{ height: '1px', backgroundColor: '#f3f4f6' }}></div>

            {/* 여유 시간 */}
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>⏱</span>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>이번 주 예상 여유 시간</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-1px', color: '#111', lineHeight: 1 }}>18<span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', marginLeft: '2px' }}>h</span></div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', lineHeight: 1.5 }}>시험 기간 및 고정 일정 제외</div>
            </div>

            {/* 프로필 매칭 */}
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>프로필 적합도 요약</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#111', letterSpacing: '-0.5px' }}>{total}<span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280' }}>개 공고 매칭</span></div>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#374151' }}>
                  <span style={{ color: '#10b981' }}>✓</span> 컴퓨터공학과 조건 충족
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#374151' }}>
                  <span style={{ color: '#10b981' }}>✓</span> 경상남도 거주 조건 충족
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* 일정 상세 모달 */}
      {selectedDayEvents && selectedDayEvents.length > 0 && (
        <>
          {/* 배경 */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
            }}
            onClick={() => {
              setSelectedDayEvents(null)
              setSelectedDay(null)
            }}
          />

          {/* 모달 */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111' }}>
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월 {selectedDay}일
              </h2>
              <button
                onClick={() => {
                  setSelectedDayEvents(null)
                  setSelectedDay(null)
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#6b7280',
                }}
              >
                ×
              </button>
            </div>

            {/* 일정 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedDayEvents.map((evt, idx) => {
                const EVENT_COLORS: { [key: string]: { bg: string; text: string; border: string } } = {
                  EXAM: { bg: '#fef3c7', text: '#d97706', border: '#f59e0b' },
                  PART_TIME: { bg: '#dbeafe', text: '#2563eb', border: '#3b82f6' },
                  OTHER: { bg: '#e5e7eb', text: '#374151', border: '#9ca3af' },
                }

                const colors = EVENT_COLORS[evt.type as keyof typeof EVENT_COLORS] || EVENT_COLORS.OTHER
                const startDate = new Date(evt.dtstart)
                const endDate = new Date(evt.dtend)

                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: colors.text,
                      marginBottom: '6px',
                    }}>
                      {evt.title}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: colors.text,
                      opacity: 0.8,
                      lineHeight: 1.4,
                    }}>
                      <div>📅 {startDate.toLocaleDateString('ko-KR')} ~ {endDate.toLocaleDateString('ko-KR')}</div>
                      {!evt.isAllDay && (
                        <div>🕐 {startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ {endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                      {evt.isAllDay && <div>🕐 하루 종일</div>}
                      {evt.memo && <div>📝 {evt.memo}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
