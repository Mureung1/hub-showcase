import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { QueryData } from '../../types/overlay';
import DdayBadge from '../common/DdayBadge';

type QueryResultProps = {
  data: QueryData;
  onBack: () => void;
};

export default function QueryResult({ data, onBack }: QueryResultProps) {
  return (
    <div className="query-result">
      <div className="query-result__header">
        <h2 className="query-result__title">
          {data.title} <span className="query-result__count">{data.count}건</span>
        </h2>
        <span className="query-result__sort">{data.sortLabel}</span>
      </div>
      <div className="query-result__list">
        {data.items.map((item) => (
          <div key={item.id} className="query-result-item">
            <div className="query-result-item__info">
              <span className="query-result-item__title">{item.title}</span>
              <span className="query-result-item__date">
                {format(parseISO(item.deadline), 'M월 d일 (eee)', { locale: ko })}
              </span>
            </div>
            <DdayBadge deadline={item.deadline} baseDate={data.baseDate} />
          </div>
        ))}
      </div>
      <button className="query-back-btn" onClick={onBack}>
        브리핑으로 돌아가기
      </button>
    </div>
  );
}
