const DATE_INPUT_CLASS =
  "px-md py-md border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

function DateRangeQuestion({ value, onChange }) {
  const start = value?.start ?? "";
  const end = value?.end ?? "";

  const handleStartChange = (nextStart) => {
    // 시작일을 종료일보다 늦게 바꾸면 기존 종료일이 더 이상 유효하지 않으니 초기화한다.
    const nextEnd = end && nextStart > end ? "" : end;
    onChange({ start: nextStart, end: nextEnd });
  };

  const handleEndChange = (nextEnd) => {
    onChange({ start, end: nextEnd });
  };

  return (
    <div className="flex items-center gap-md py-lg">
      <span className="material-symbols-outlined text-primary">calendar_month</span>
      <input
        type="date"
        value={start}
        onChange={(e) => handleStartChange(e.target.value)}
        className={DATE_INPUT_CLASS}
      />
      <span className="text-on-surface-variant">~</span>
      <input
        type="date"
        value={end}
        min={start || undefined}
        disabled={!start}
        onChange={(e) => handleEndChange(e.target.value)}
        className={DATE_INPUT_CLASS}
      />
    </div>
  );
}

export default DateRangeQuestion;
