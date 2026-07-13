import { Posting, postingsApi } from '../utils/apiClient'
import { useState } from 'react'

interface PostingCardProps {
  posting: Posting
  onScrapChange?: (id: string, isScrapped: boolean) => void
}

export default function PostingCard({ posting, onScrapChange }: PostingCardProps) {
  const [isScrapped, setIsScrapped] = useState(posting.isScraped)
  const [isLoading, setIsLoading] = useState(false)

  const handleScrap = async () => {
    setIsLoading(true)
    try {
      await postingsApi.scrap(posting.id)
      setIsScrapped(!isScrapped)
      onScrapChange?.(posting.id, !isScrapped)
    } catch (error) {
      console.error('스크랩 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // D-Day 계산
  const dDay = Math.ceil(
    (new Date(posting.receptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  const dDayClass =
    dDay <= 0 ? 'text-danger' : dDay <= 3 ? 'text-warning' : 'text-text-secondary'

  // 카테고리별 색상
  const categoryColors: Record<string, string> = {
    COMPETITION: 'bg-blue-100 text-blue-700',
    ACTIVITY: 'bg-green-100 text-green-700',
    POLICY: 'bg-purple-100 text-purple-700',
    CAMPUS_EVENT: 'bg-orange-100 text-orange-700',
  }

  const categoryLabel: Record<string, string> = {
    COMPETITION: '공모전',
    ACTIVITY: '대외활동',
    POLICY: '정책/지원금',
    CAMPUS_EVENT: '교내행사',
  }

  const categoryClass = categoryColors[posting.category] || 'bg-gray-100 text-gray-700'

  return (
    <div className="bg-bg-primary rounded-2xl p-6 border border-border hover:shadow-md transition-shadow">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          {/* 카테고리 */}
          <span className={`inline-block px-3 py-1 rounded-9999 text-xs font-semibold mb-2 ${categoryClass}`}>
            {categoryLabel[posting.category] || posting.category}
          </span>

          {/* 제목 */}
          <h3 className="text-md font-semibold text-text-primary line-clamp-2 mb-2">
            {posting.title}
          </h3>
        </div>

        {/* 스크랩 버튼 */}
        <button
          onClick={handleScrap}
          disabled={isLoading}
          className={`ml-2 px-3 py-2 rounded-2 text-sm font-medium transition-colors ${
            isScrapped
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-text-secondary hover:bg-gray-300'
          }`}
        >
          {isScrapped ? '★' : '☆'}
        </button>
      </div>

      {/* 적격 여부 */}
      <div className="mb-4 flex items-center gap-2">
        {posting.isEligible ? (
          <span className="inline-block px-3 py-1 bg-green-100 text-success text-xs font-semibold rounded-2">
            ✓ 지원 가능
          </span>
        ) : (
          <span className="inline-block px-3 py-1 bg-red-100 text-danger text-xs font-semibold rounded-2">
            ✗ 조건 불일치
          </span>
        )}
        <span className="text-xs text-text-secondary">
          매칭도: {posting.matchScore}%
        </span>
      </div>

      {/* 마감일 */}
      <div className="mb-4 pb-4 border-b border-border">
        <div className="text-sm text-text-secondary mb-2">접수 마감</div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-text-primary font-medium">
            {new Date(posting.receptionEndDate).toLocaleDateString('ko-KR')}
          </span>
          <span className={`text-sm font-semibold ${dDayClass}`}>
            {dDay > 0 ? `D-${dDay}` : dDay === 0 ? '오늘 마감' : '마감됨'}
          </span>
        </div>
      </div>

      {/* 자격요건 요약 */}
      <div className="mb-4 text-sm text-text-secondary">
        <div className="mb-2 font-semibold text-text-primary">자격요건</div>
        <ul className="space-y-1 text-xs">
          {posting.eligibility.majors.length > 0 && (
            <li>전공: {posting.eligibility.majors.join(', ')}</li>
          )}
          {posting.eligibility.grades.length > 0 && (
            <li>학년: {posting.eligibility.grades.join(', ')}학년</li>
          )}
          {posting.eligibility.regions.length > 0 && (
            <li>거주지: {posting.eligibility.regions.join(', ')}</li>
          )}
          {posting.eligibility.ageMin || posting.eligibility.ageMax ? (
            <li>
              나이:{' '}
              {posting.eligibility.ageMin || '제한없음'} ~{' '}
              {posting.eligibility.ageMax || '제한없음'}
            </li>
          ) : null}
          {posting.eligibility.incomeMax && (
            <li>소득분위: {posting.eligibility.incomeMax}분위 이하</li>
          )}
        </ul>
      </div>

      {/* 링크 */}
      <a
        href={posting.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-primary font-medium hover:underline"
      >
        자세히 보기 →
      </a>
    </div>
  )
}
