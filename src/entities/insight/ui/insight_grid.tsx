import { CategoryTag } from '@/shared/ui';

import type { Insight } from '../model/insight';
import './insight_grid.css';

export function InsightGrid({ insights }: { insights: Insight[] }) {
  return (
    <div className="insight-grid">
      {insights.map((insight) => (
        <article className="insight-card" key={insight.id}>
          <div className="insight-card__thumbnail" aria-hidden="true">
            {insight.thumbnail}
          </div>
          <div className="insight-card__body">
            <p className="insight-card__domain">{insight.domain}</p>
            <h3 className="insight-card__title">{insight.title}</h3>
            {insight.memo ? (
              <p className="insight-card__memo">{insight.memo}</p>
            ) : null}
            {insight.categories.length > 0 ? (
              <ul
                className="insight-card__categories"
                aria-label="카테고리 목록"
              >
                {insight.categories.map((category) => (
                  <li key={category.name}>
                    <CategoryTag
                      className="insight-card__category"
                      tone={category.tone}
                    >
                      {category.name}
                    </CategoryTag>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <a className="insight-card__source" href={insight.url}>
            원문 열기
          </a>
        </article>
      ))}
    </div>
  );
}
