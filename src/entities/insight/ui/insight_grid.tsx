import { CategoryTag, type CategoryTone } from '@/shared/ui';

import type { Insight } from '../model/insight';
import './insight_grid.css';

export function InsightGrid({ insights }: { insights: Insight[] }) {
  return (
    <div className="insight-grid">
      {insights.map((insight) => (
        <article className="insight-card" key={insight.id}>
          <div className="insight-card__thumbnail" aria-hidden="true">
            {getThumbnailLabel(insight.domain)}
          </div>
          <div className="insight-card__body">
            <p className="insight-card__domain">{insight.domain}</p>
            <h3 className="insight-card__title">{insight.title}</h3>
            {insight.memo ? (
              <p className="insight-card__memo">{insight.memo}</p>
            ) : null}
            {insight.category ? (
              <ul
                className="insight-card__categories"
                aria-label="카테고리 목록"
              >
                <li>
                  <CategoryTag
                    className="insight-card__category"
                    tone={getCategoryTone(insight.category)}
                  >
                    {insight.category}
                  </CategoryTag>
                </li>
              </ul>
            ) : null}
          </div>
          <a className="insight-card__source" href={insight.originalUrl}>
            원문 열기
          </a>
        </article>
      ))}
    </div>
  );
}

const CATEGORY_TONES: Record<string, CategoryTone> = {
  개발: 'green',
  디자인: 'blue',
  팀프로젝트: 'amber',
  공부: 'slate',
  취업: 'coral',
};

function getCategoryTone(category: string) {
  return CATEGORY_TONES[category] ?? 'slate';
}

function getThumbnailLabel(domain: string) {
  return domain.split('.')[0]?.slice(0, 2).toUpperCase() ?? '';
}
