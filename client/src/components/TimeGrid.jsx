import './TimeGrid.css';
import TimeCell from './TimeCell';
import { formatMonthDay, getWeekdayLabel } from '../utils/date';
import { getHeatLevel } from '../utils/availability';

const START_HOUR = 9;
const END_HOUR = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function slotKey(date, hour) {
  return `${date}_${hour}`;
}

function TimeGrid({ dates, slotStats, selectedKeys, totalMembers, highlightedKey, onToggleCell }) {
  return (
    <div className="time-grid">
      <div className="time-grid-header">
        <div />
        {dates.map((date) => (
          <div key={date} className="date-header">
            <span className="date-header-day">{formatMonthDay(date)}</span>
            <span className="date-header-weekday">{getWeekdayLabel(date)}</span>
          </div>
        ))}
      </div>

      {HOURS.map((hour) => (
        <div className="time-grid-row" key={hour}>
          <div className="time-label">{hour}시</div>
          {dates.map((date) => {
            const key = slotKey(date, hour);
            const stat = slotStats.get(key);
            const count = stat ? stat.count : 0;
            const names = stat ? stat.names : [];

            return (
              <TimeCell
                key={key}
                level={getHeatLevel(count, totalMembers)}
                count={count}
                names={names}
                isMine={selectedKeys.has(key)}
                isHighlighted={key === highlightedKey}
                onClick={() => onToggleCell(date, hour)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default TimeGrid;
