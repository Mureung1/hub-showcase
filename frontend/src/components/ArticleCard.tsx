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
}

export default function ArticleCard({ article, variant = 'feature' }: ArticleCardProps) {
  const isCompact = variant === 'compact'
  const interestName = article.interestTags[0]?.name

  return (
    <article className={`card${isCompact ? '' : ' today-feature-card'}`}>
      <p className="card-meta">
        {article.sourceName}
        <span className="dot" />
        {SOURCE_TYPE_LABEL[article.sourceType]}
        {interestName && <span className="topic-tag">{interestName}</span>}
      </p>

      <h2 className={`card-title${isCompact ? ' card-title--compact' : ''}`}>
        {article.title}
      </h2>

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
            <a
              className="card-link"
              href={article.originalUrl}
              target="_blank"
              rel="noreferrer"
            >
              읽고 미션 받기
              <ArrowIcon />
            </a>
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
