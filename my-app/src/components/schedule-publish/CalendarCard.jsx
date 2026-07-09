import Card from "../Card";

function CalendarCard({ month, weekLabels, dates, timeOptions, selectedDay, selectedTime, onSelectDay, onSelectTime }) {
  return (
    <Card className="flex flex-col gap-md">
      <div className="flex items-center gap-xs">
        <span className="material-symbols-outlined text-on-surface-variant">calendar_month</span>
        <h2 className="font-headline-sm text-headline-sm">발행 일정</h2>
      </div>
      <p className="font-label-md text-label-md text-on-surface-variant">{month}</p>

      <div className="grid grid-cols-7 gap-xs text-center">
        {weekLabels.map((label) => (
          <span key={label} className="text-on-surface-variant font-label-md opacity-50">
            {label}
          </span>
        ))}
        {dates.map(({ day, disabled }) => (
          <button
            key={day}
            type="button"
            disabled={disabled}
            onClick={() => onSelectDay(day)}
            className={`p-xs rounded font-body-sm transition-colors ${
              disabled
                ? "text-on-surface-variant opacity-30 cursor-not-allowed"
                : day === selectedDay
                ? "bg-primary text-on-primary font-bold shadow-soft"
                : "hover:bg-surface-container-high"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-sm mt-md">
        <div className="flex-1">
          <label className="font-label-md text-label-md text-on-surface-variant mb-xs block">
            시간 선택
          </label>
          <div className="relative">
            <select
              value={selectedTime}
              onChange={(e) => onSelectTime(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm appearance-none font-body-sm focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
              expand_more
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default CalendarCard;
