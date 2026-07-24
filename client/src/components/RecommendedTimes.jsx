import './RecommendedTimes.css';
import { formatMonthDaySlashWeekday } from '../utils/date';

function RecommendedTimes({ recommendations, totalMembers, onSelectSlot }) {
  return (
    <div className="recommended-times">
      <div className="recommended-times-label">추천 회의 시간</div>
      <div className="recommended-times-subtitle">이번 주 중 겹치는 인원이 많은 순</div>

      {recommendations.length === 0 ? (
        <div className="recommended-times-empty">아직 아무도 시간을 등록하지 않았어요.</div>
      ) : (
        <div className="recommended-times-list">
          {recommendations.map((item, index) => {
            const isFull = item.count === totalMembers;
            const availabilityLabel = isFull ? `${item.count}명 모두 가능` : `${item.count}명 가능`;

            return (
              <button
                type="button"
                key={item.key}
                className="recommended-time-item"
                onClick={() => onSelectSlot(item.date, item.hour)}
              >
                <span className={`recommended-time-rank${isFull ? ' full' : ''}`}>{index + 1}</span>
                <span className="recommended-time-text">
                  {formatMonthDaySlashWeekday(item.date)} {item.hour}시 — {availabilityLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecommendedTimes;
