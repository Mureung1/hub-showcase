import type { TodayArticle } from '../api/types'

const SOURCE_TYPE_LABEL = {
  news: '뉴스',
  official_blog: '공식 블로그',
  expert_article: '전문 아티클',
} as const

// custom-ident는 숫자로 시작할 수 없어 접두어를 붙인다. 같은 글은 항상 feature/compact 중
// 하나로만 렌더링되므로 이름이 중복될 일이 없다.
function toViewTransitionName(articleId: string): string {
  return `today-card-${articleId}`
}

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

  if (isCompact) {
    return (
      <article
        className={`today-recommendation-card${
          article.thumbnailUrl ? ' today-recommendation-card--with-thumbnail' : ''
        }`}
        style={{ viewTransitionName: toViewTransitionName(article.id) }}
      >
        <button type="button" className="today-recommendation-select" onClick={onSelect}>
          <span className="today-recommendation-meta">
            <span className="today-recommendation-source">{article.sourceName}</span>
            {interestName && <span className="topic-tag">{interestName}</span>}
          </span>
          <span className="today-recommendation-title">{article.title}</span>
        </button>
        {article.thumbnailUrl && (
          <img
            className="today-recommendation-thumbnail"
            src={article.thumbnailUrl}
            alt=""
            aria-hidden="true"
          />
        )}
      </article>
    )
  }

  return (
    <article
      className="today-feature-card"
      style={{ viewTransitionName: toViewTransitionName(article.id) }}
    >
      <p className="card-meta">{metaContent}</p>
      <h2 className="today-feature-title">{article.title}</h2>

      {article.officialExcerpt && (
        <p className="today-feature-excerpt">{article.officialExcerpt}</p>
      )}

      <div className="today-feature-footer">
        <span className="today-feature-readtime">
          {article.readingTimeMinutes != null
            ? `약 ${article.readingTimeMinutes}분 · 원문 그대로`
            : '원문 그대로'}
        </span>
        <button type="button" className="today-feature-cta" onClick={onOpenIntro}>
          읽고 미션 받기
          <ArrowIcon />
        </button>
      </div>
    </article>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 12L12 5M12 5H6M12 5V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
