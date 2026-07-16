import { Posting, postingsApi } from '../utils/apiClient'
import { useState } from 'react'

interface PostingCardProps {
  posting: Posting
  onScrapChange?: (id: string, isScrapped: boolean) => void
  onAddToCalendar?: (posting: Posting) => void
}

export default function PostingCard({ posting, onScrapChange, onAddToCalendar }: PostingCardProps) {
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

  const dDayColor = dDay <= 0 ? '#ef4444' : dDay <= 3 ? '#f59e0b' : '#6b7280'

  // 카테고리별 색상 (design-guide.md 기준)
  const categoryStyles: Record<string, { bg: string; text: string; label: string }> = {
    COMPETITION: { bg: '#fef3c7', text: '#d97706', label: '공모전' },
    ACTIVITY: { bg: '#ede9fe', text: '#6366f1', label: '대외활동' },
    POLICY: { bg: '#d1fae5', text: '#059669', label: '정책·지원금' },
    CAMPUS_EVENT: { bg: '#dbeafe', text: '#2563eb', label: '교내행사' },
  }

  const catStyle = categoryStyles[posting.category] || categoryStyles.ACTIVITY

  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '18px',
      gap: '10px',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 120ms',
      cursor: 'pointer',
      minHeight: '480px',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none'
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          {/* 카테고리 배지 */}
          <div style={{
            display: 'inline-block',
            backgroundColor: catStyle.bg,
            color: catStyle.text,
            padding: '3px 9px',
            borderRadius: '9999px',
            fontSize: '10px',
            fontWeight: 600,
            marginBottom: '8px',
          }}>
            {catStyle.label}
          </div>

          {/* 제목 */}
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#111',
            marginBottom: '8px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
            minHeight: '39.2px',
          }}>
            {posting.title}
          </h3>
        </div>

        {/* 스크랩 버튼 */}
        <button
          onClick={handleScrap}
          disabled={isLoading}
          style={{
            marginLeft: '8px',
            padding: '7px 12px',
            borderRadius: '8px',
            backgroundColor: isScrapped ? '#6366f1' : '#f3f4f6',
            color: isScrapped ? '#fff' : '#111',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 600,
            transition: 'all 120ms',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isScrapped ? '★' : '☆'}
        </button>
      </div>

      {/* 적격 여부 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', lineHeight: 1.4 }}>
        <span style={{
          display: 'inline-block',
          padding: '3px 9px',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: 600,
          backgroundColor: posting.isEligible ? '#dcfce7' : '#fee2e2',
          color: posting.isEligible ? '#22c55e' : '#ef4444',
          lineHeight: 1.4,
        }}>
          {posting.isEligible ? '✓ 지원 가능' : '✗ 조건 불일치'}
        </span>
        <span style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.4 }}>
          매칭도: {posting.matchScore}%
        </span>

        {/* 스마트 추천 배지 */}
        {posting.smartScore && (
          <span style={{
            display: 'inline-block',
            padding: '3px 9px',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 600,
            backgroundColor: posting.smartScore.isRecommended ? '#dcfce7' : '#fee2e2',
            color: posting.smartScore.isRecommended ? '#22c55e' : '#ef4444',
          }}>
            {posting.smartScore.isRecommended ? '⏰ 추천' : '⏰ 주의'}
          </span>
        )}
      </div>

      {/* 스마트 추천 메시지 */}
      {posting.smartScore && (
        <div style={{
          marginBottom: '10px',
          padding: '10px',
          borderRadius: '8px',
          backgroundColor: posting.smartScore.isRecommended ? '#f0fdf4' : '#fef2f2',
          borderLeft: `3px solid ${posting.smartScore.isRecommended ? '#22c55e' : '#ef4444'}`,
          fontSize: '12px',
          color: posting.smartScore.isRecommended ? '#22c55e' : '#ef4444',
          lineHeight: '1.4',
        }}>
          {posting.smartScore.reason}
        </div>
      )}

      {/* 마감일 */}
      <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb', lineHeight: 1.4 }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', lineHeight: 1.4 }}>접수 마감</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: 1.4 }}>
          <span style={{ fontSize: '13px', color: '#111', fontWeight: 500, lineHeight: 1.4 }}>
            {new Date(posting.receptionEndDate).toLocaleDateString('ko-KR')}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: dDayColor, lineHeight: 1.4 }}>
            {dDay > 0 ? `D-${dDay}` : dDay === 0 ? '오늘 마감' : '마감됨'}
          </span>
        </div>
      </div>

      {/* 자격요건 요약 */}
      <div style={{ marginBottom: '10px', fontSize: '13px', color: '#6b7280', lineHeight: 1.4 }}>
        <div style={{ marginBottom: '6px', fontWeight: 600, color: '#111', lineHeight: 1.4 }}>자격요건</div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {posting.eligibility.majors.length > 0 && (
            <li style={{ fontSize: '11px', lineHeight: 1.4 }}>전공: {posting.eligibility.majors.join(', ')}</li>
          )}
          {posting.eligibility.grades.length > 0 && (
            <li style={{ fontSize: '11px', lineHeight: 1.4 }}>학년: {posting.eligibility.grades.join(', ')}학년</li>
          )}
          {posting.eligibility.regions.length > 0 && (
            <li style={{ fontSize: '11px', lineHeight: 1.4 }}>거주지: {posting.eligibility.regions.join(', ')}</li>
          )}
          {posting.eligibility.ageMin || posting.eligibility.ageMax ? (
            <li style={{ fontSize: '11px', lineHeight: 1.4 }}>
              나이: {posting.eligibility.ageMin || '제한없음'} ~ {posting.eligibility.ageMax || '제한없음'}
            </li>
          ) : null}
          {posting.eligibility.incomeMax && (
            <li style={{ fontSize: '11px', lineHeight: 1.4 }}>소득분위: {posting.eligibility.incomeMax}분위 이하</li>
          )}
        </ul>
      </div>

      {/* 콘텐츠와 버튼 사이 여백 */}
      <div style={{ flex: 1 }}></div>

      {/* 버튼들 */}
      <div style={{ display: 'flex', gap: '8px', minHeight: '38px', flexShrink: 0 }}>
        {/* 일정에 추가 버튼 */}
        <button
          onClick={() => onAddToCalendar?.(posting)}
          style={{
            flex: 1,
            padding: '0 12px',
            borderRadius: '8px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            border: '1px solid #86efac',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 120ms',
            minHeight: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#dcfce7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f0fdf4'
          }}
        >
          일정에 추가
        </button>

        {/* 자세히 보기 링크 */}
        <a
          href={posting.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#6366f1',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
            borderRadius: '8px',
            padding: '0 12px',
            backgroundColor: '#ede9fe',
            border: '1px solid #c4b5fd',
            transition: 'all 120ms',
            minHeight: '38px',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ddd6fe'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ede9fe'
          }}
        >
          자세히 보기
        </a>
      </div>
    </div>
  )
}
