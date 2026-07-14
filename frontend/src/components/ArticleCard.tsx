export type Article = {
  id: string
  title: string
  sourceName: string
  // 프로토타입의 "칼럼", "뉴스레터" 라벨. DB의 content_type(article/blog/video)과
  // 아직 매핑되지 않았다. 매핑 규칙을 정한 뒤 이 필드를 교체한다.
  contentTypeLabel: string
  interestName: string
  officialExcerpt: string
  readingTimeMinutes: number
}

type ArticleCardProps = {
  article: Article
  // 오늘의 대표 글과 "이런 글도 있어요" 목록은 같은 카드의 다른 모양이다.
  variant?: 'feature' | 'compact'
  onClick?: () => void
}

export default function ArticleCard({
  article,
  variant = 'feature',
  onClick,
}: ArticleCardProps) {
  const isCompact = variant === 'compact'

  return (
    <article
      className={`card${isCompact ? '' : ' today-feature-card'}`}
      onClick={onClick}
    >
      <p className="card-meta">
        {article.sourceName}
        <span className="dot" />
        {article.contentTypeLabel}
        <span className="topic-tag">{article.interestName}</span>
      </p>

      <h2 className={`card-title${isCompact ? ' card-title--compact' : ''}`}>
        {article.title}
      </h2>

      {!isCompact && (
        <>
          <p className="card-body">{article.officialExcerpt}</p>

          <div className="card-footer">
            <span>약 {article.readingTimeMinutes}분 · 원문 그대로</span>
            <span className="card-link">
              읽고 미션 받기
              <ArrowIcon />
            </span>
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
