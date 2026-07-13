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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  const limit = 12

  const fetchPostings = async (category: Category, page: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await postingsApi.list(limit, page * limit, category)
      if (response) {
        setPostings(response.postings)
        setTotal(response.pagination.total)
      }
    } catch (err: any) {
      console.error('공고 조회 실패:', err)
      setError(err.message || '공고를 불러올 수 없습니다')
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
    fetchPostings(selectedCategory, offset)
  }, [selectedCategory, offset])

  const currentPage = offset / limit
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* 헤더 */}
      <div className="bg-bg-primary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            맞춤형 공고
          </h1>
          <p className="text-md text-text-secondary">
            당신의 프로필에 맞는 공고를 찾아보세요
          </p>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="bg-bg-primary border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`px-4 py-2 rounded-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat.value
                    ? 'bg-primary text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 에러 표시 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2 text-danger text-sm">
            {error}
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-text-secondary">공고를 불러오는 중...</p>
          </div>
        )}

        {/* 공고 목록 */}
        {!isLoading && postings.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {postings.map(posting => (
                <PostingCard
                  key={posting.id}
                  posting={posting}
                  onScrapChange={() => {
                    // 스크랩 상태 업데이트
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
            <div className="flex justify-center gap-2 mb-8">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 rounded-2 border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-secondary"
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
                    className={`px-3 py-2 rounded-2 text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-primary text-white'
                        : 'border border-border hover:bg-bg-secondary'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}

              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-4 py-2 rounded-2 border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-secondary"
              >
                다음
              </button>
            </div>

            {/* 통계 */}
            <div className="text-center text-sm text-text-secondary">
              총 {total}개의 공고 중 {offset + postings.length}개 표시
            </div>
          </>
        )}

        {/* 결과 없음 */}
        {!isLoading && postings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">
              해당하는 공고가 없습니다
            </p>
            <button
              onClick={() => handleCategoryChange('all')}
              className="px-4 py-2 rounded-2 bg-primary text-white hover:opacity-90"
            >
              전체 보기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
