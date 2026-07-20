import type { TodayArticle } from '../api/types'

const SOURCE_TYPE_LABEL = {
  news: '뉴스',
  official_blog: '공식 블로그',
  expert_article: '전문 아티클',
} as const

type ArticleCardProps = {
  article: TodayArticle
  // 오늘의 대표 글과 "이런 글도 있어요" 목록은 같은 카드의 다른 모양이다.
  variant?: 'feature' | 'compact'
  onSelect?: () => void
  onOpenIntro?: () => void
}

export default function ArticleCard({
  article,
  variant = 'feature',
  onSelect,
  onOpenIntro,
}: ArticleCardProps) {
  const isCompact = variant === 'compact'
  const interestName = article.interestTags[0]?.name

  const metaContent = (
    <>
      {article.sourceName}
      <span className="dot" />
      {SOURCE_TYPE_LABEL[article.sourceType]}
      {interestName && <span className="topic-tag">{interestName}</span>}
    </>
  )

  return (
    <article className={`card${isCompact ? '' : ' today-feature-card'}`}>
      {isCompact ? (
        <button type="button" className="card-compact-select" onClick={onSelect}>
          <span className="card-meta">{metaContent}</span>
          <span className="card-title card-title--compact">{article.title}</span>
        </button>
      ) : (
        <>
          <p className="card-meta">{metaContent}</p>
          <h2 className="card-title">{article.title}</h2>
        </>
      )}

      {!isCompact && (
        <>
          {article.officialExcerpt && (
            <p className="card-body">{article.officialExcerpt}</p>
          )}

          <div className="card-footer">
            <span>
              {article.readingTimeMinutes != null
                ? `약 ${article.readingTimeMinutes}분 · 원문 그대로`
                : '원문 그대로'}
            </span>
            <button type="button" className="card-link" onClick={onOpenIntro}>
              글 살펴보기
              <ArrowIcon />
            </button>
          </div>
        </>
      )}
    </article>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
