import { useEffect, useState } from 'react'
import { postingsApi, Posting } from '../utils/apiClient'
import PostingCard from '../components/PostingCard'

type Category = 'all' | 'COMPETITION' | 'ACTIVITY' | 'POLICY' | 'CAMPUS_EVENT'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'COMPETITION', label: '공모전' },
  { value: 'ACTIVITY', label: '대외활동' },
  { value: 'POLICY', label: '정책/지원금' },
  { value: 'CAMPUS_EVENT', label: '교내행사' },
]

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [postings, setPostings] = useState<Posting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [useSmartMatching, setUseSmartMatching] = useState(false)

  const limit = 12

  const fetchPostings = async (category: Category, page: number, smart: boolean) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await postingsApi.list(limit, page * limit, category, smart)
      console.log('응답 데이터:', response)
      if (response?.data) {
        setPostings(response.data.postings || [])
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError('응답 데이터 형식이 올바르지 않습니다')
      }
    } catch (err: any) {
      console.error('공고 조회 실패:', err)
      setError(err.message || '공고를 불러올 수 없습니다')
      setPostings([])
    } finally {
      setIsLoading(false)
    }
  }

  // 카테고리 변경
  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category)
    setOffset(0)
  }

  // 초기 로드 및 카테고리 변경 시
  useEffect(() => {
    fetchPostings(selectedCategory, offset / limit, useSmartMatching)
  }, [selectedCategory, offset, useSmartMatching])

  const currentPage = Math.floor(offset / limit)
  const totalPages = Math.ceil(total / limit)

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
                맞춤형 공고
              </h1>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>
                당신의 프로필에 맞는 공고를 찾아보세요
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
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '16px' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 120ms',
                  backgroundColor: selectedCategory === cat.value ? '#6366f1' : 'transparent',
                  color: selectedCategory === cat.value ? '#fff' : '#6b7280',
                  borderBottom: selectedCategory === cat.value ? 'none' : '1px solid #e5e7eb',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        {/* 에러 표시 */}
        {error && (
          <div style={{
            marginBottom: '24px',
            padding: '12px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#ef4444',
          }}>
            {error}
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading ? (
          <div style={{ textAlign: 'center', paddingTop: '48px' }}>
            <div style={{
              display: 'inline-block',
              animation: 'spin 1s linear infinite',
              width: '48px',
              height: '48px',
              border: '2px solid #6366f1',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
            }}></div>
            <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '13px' }}>
              공고를 불러오는 중...
            </p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : postings.length > 0 ? (
          <>
            {/* 공고 그리드 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '14px',
              marginBottom: '32px',
            }}>
              {postings.map(posting => (
                <PostingCard
                  key={posting.id}
                  posting={posting}
                  onScrapChange={() => {
                    setPostings(prev =>
                      prev.map(p =>
                        p.id === posting.id
                          ? { ...p, isScraped: !p.isScraped }
                          : p
                      )
                    )
                  }}
                />
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
              총 {total}개의 공고 중 {offset + postings.length}개 표시
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', paddingTop: '48px' }}>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '13px' }}>
              해당하는 공고가 없습니다
            </p>
            <button
              onClick={() => handleCategoryChange('all')}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                backgroundColor: '#6366f1',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 120ms',
              }}
            >
              전체 보기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
