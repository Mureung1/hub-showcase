import './TimeGrid.css';
import TimeCell from './TimeCell';
import { formatMonthDayWeekday } from '../utils/date';

const START_HOUR = 9;
const END_HOUR = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function slotKey(date, hour) {
  return `${date}_${hour}`;
}

function TimeGrid({ dates, selectedKeys, onToggleCell }) {
  return (
    <div className="time-grid">
      <div className="time-grid-header">
        <div />
        {dates.map((date) => (
          <div key={date} className="date-header">
            {formatMonthDayWeekday(date)}
          </div>
        ))}
      </div>

      {HOURS.map((hour) => (
        <div className="time-grid-row" key={hour}>
          <div className="time-label">{hour}시</div>
          {dates.map((date) => (
            <TimeCell
              key={slotKey(date, hour)}
              isSelected={selectedKeys.has(slotKey(date, hour))}
              onClick={() => onToggleCell(date, hour)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default TimeGrid;
