import { useEffect, useState } from 'react'
import { scrapsApi } from '../utils/apiClient'
import PostingCard from '../components/PostingCard'

interface ScrapListPageProps {
  setCurrentPage?: (page: 'auth' | 'profile' | 'dashboard' | 'calendar') => void
}

export default function ScrapListPage({ setCurrentPage }: ScrapListPageProps) {
  const [scraps, setScraps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [sortBy, setSortBy] = useState<'dday' | 'date'>('dday')

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

  useEffect(() => {
    fetchScraps(offset / limit, sortBy)
  }, [offset, sortBy])

  const currentPage = Math.floor(offset / limit)
  const totalPages = Math.ceil(total / limit)

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
            ♡ 내 스크랩
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            스크랩한 공고 {total}개
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
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

              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = currentPage + i
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
  )
}
