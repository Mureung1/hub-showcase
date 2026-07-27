const SEOUL_TIME_ZONE = 'Asia/Seoul';
const DAY_MS = 24 * 60 * 60 * 1000;

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function getReadingActivityRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  const today = new Date(Date.UTC(values.year, values.month - 1, values.day));
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const from = new Date(today.getTime() - (daysSinceMonday + 77) * DAY_MS);
  const to = new Date(from.getTime() + 83 * DAY_MS);

  return { from: formatIsoDate(from), to: formatIsoDate(to), today: formatIsoDate(today) };
}

function getCalendarDays(activity) {
  const counts = new Map(activity.days.map(({ date, count }) => [date, count]));
  const from = new Date(`${activity.from}T00:00:00Z`);
  return Array.from({ length: 84 }, (_, index) => {
    const date = formatIsoDate(new Date(from.getTime() + index * DAY_MS));
    return { date, count: counts.get(date) ?? 0 };
  });
}

function formatDayLabel(date, count, isFuture) {
  const label = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00Z`));
  if (isFuture) return `${label}, 아직 오지 않은 날`;
  return `${label}, 독서 기록 ${count}개`;
}

export function ReadingActivityCalendar({ activity, isLoading, error, onRetry }) {
  const today = getReadingActivityRange().today;
  const days = activity ? getCalendarDays(activity) : [];
  const activeDayCount = activity?.days.length ?? 0;

  return (
    <section className="reading-activity-calendar" aria-labelledby="reading-activity-title">
      <header className="reading-activity-calendar__header">
        <div>
          <p className="section-kicker">READING RHYTHM</p>
          <h2 id="reading-activity-title">최근 12주의 읽기 기록</h2>
        </div>
        {activity && <span>{activeDayCount}일 기록</span>}
      </header>

      {isLoading ? (
        <p className="reading-activity-calendar__status" role="status">읽기 기록을 불러오고 있어요.</p>
      ) : error ? (
        <div className="reading-activity-calendar__status">
          <p role="alert">{error}</p>
          <button type="button" onClick={onRetry}>다시 불러오기</button>
        </div>
      ) : (
        <>
          <div className="reading-activity-calendar__body">
            <div className="reading-activity-calendar__weekdays" aria-hidden="true">
              <span>월</span>
              <span>화</span>
              <span>수</span>
              <span>목</span>
              <span>금</span>
              <span>토</span>
              <span>일</span>
            </div>
            <div className="reading-activity-calendar__grid" role="grid" aria-label="최근 12주 날짜별 독서 기록 수">
              {days.map(({ date, count }) => {
                const isFuture = date > today;
                const level = isFuture ? 0 : Math.min(count, 4);
                const label = formatDayLabel(date, count, isFuture);
                return (
                  <time
                    className={`reading-activity-calendar__day reading-activity-calendar__day--${level}${isFuture ? ' is-future' : ''}`}
                    dateTime={date}
                    key={date}
                    role="gridcell"
                    aria-label={label}
                    title={label}
                    tabIndex={count > 0 && !isFuture ? 0 : undefined}
                  />
                );
              })}
            </div>
          </div>
          {!activeDayCount && (
            <p className="reading-activity-calendar__empty">
              아직 표시할 기록이 없어요. 다음 기록을 남기면 읽은 날짜가 이곳에 채워져요.
            </p>
          )}
        </>
      )}
    </section>
  );
}
