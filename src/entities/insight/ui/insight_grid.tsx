import type { Insight } from '@/entities/insight';
import { CategoryTag } from '@/shared/ui';

export function InsightGrid({ insights }: { insights: Insight[] }) {
  return (
    <div className="insight-grid">
      {insights.map((insight) => (
        <article className="insight-card" key={insight.id}>
          <div className="thumbnail" aria-hidden="true">
            {insight.thumbnail}
          </div>
          <div className="card-body">
            <p className="domain">{insight.domain}</p>
            <h3>{insight.title}</h3>
            {insight.memo ? <p className="memo">{insight.memo}</p> : null}
            {insight.categories.length > 0 ? (
              <ul className="category-list" aria-label="카테고리 목록">
                {insight.categories.map((category) => (
                  <li key={category.name}>
                    <CategoryTag
                      className={`category-pill category-${category.tone}`}
                      tone={category.tone}
                    >
                      {category.name}
                    </CategoryTag>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <a className="open-link" href={insight.url}>
            원문 열기
          </a>
        </article>
      ))}
    </div>
  );
}
