import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import { useMe } from "../features/auth";
import { Schedule, useSchedules } from "../features/schedule";
import { getScheduleDatePath, ROUTES } from "../shared/routes";
import { getSelectedStoreId } from "../shared/utils";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function parseMonthParam(monthParam: string | null) {
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return startOfMonth(new Date());
  }

  const [yearText, monthText] = monthParam.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const date = new Date(year, monthIndex, 1);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex) {
    return startOfMonth(new Date());
  }

  return startOfMonth(date);
}

function getMonthPath(date: Date) {
  return `${ROUTES.schedule}?month=${format(date, "yyyy-MM")}`;
}

function getTimeLabel(time: string) {
  return time.slice(0, 5);
}

function getScheduleDuration(schedule: Schedule) {
  const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
  const [endHour, endMinute] = schedule.endTime.split(":").map(Number);

  if (
    startHour === undefined ||
    startMinute === undefined ||
    endHour === undefined ||
    endMinute === undefined ||
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return 0;
  }

  return Math.max(0, (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60);
}

function getHoursLabel(hours: number) {
  if (hours === 0) {
    return "0시간";
  }

  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}시간`;
}

function getDayLabel(daySchedules: Schedule[], currentUserId: string | undefined) {
  if (daySchedules.length === 0) {
    return null;
  }

  if (currentUserId && daySchedules.some((schedule) => schedule.workerId === currentUserId)) {
    return "내 근무";
  }

  const workerCount = new Set(daySchedules.map((schedule) => schedule.workerId)).size;

  return `${workerCount}명 근무`;
}

function getDayTone(daySchedules: Schedule[], currentUserId: string | undefined, inCurrentMonth: boolean, date: Date) {
  const tones = ["day"];

  if (!inCurrentMonth) {
    tones.push("muted");
  }

  if (daySchedules.length > 0) {
    tones.push(currentUserId && daySchedules.some((schedule) => schedule.workerId === currentUserId) ? "shift" : "store");
  }

  if (isToday(date)) {
    tones.push("today");
  }

  return tones.join(" ");
}

function sortSchedules(schedules: Schedule[]) {
  return [...schedules].sort((first, second) => {
    const dateCompare = first.workDate.localeCompare(second.workDate);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return first.startTime.localeCompare(second.startTime);
  });
}

export function SchedulePage() {
  const [searchParams] = useSearchParams();
  const { data: me } = useMe();
  const selectedStoreId = getSelectedStoreId();
  const selectedStore = me?.stores.find((store) => store.id === selectedStoreId);
  const currentMonth = parseMonthParam(searchParams.get("month"));
  const calendarStart = startOfWeek(startOfMonth(currentMonth));
  const calendarEnd = endOfWeek(endOfMonth(currentMonth));
  const fromDate = format(calendarStart, "yyyy-MM-dd");
  const toDate = format(calendarEnd, "yyyy-MM-dd");
  const { data, error, isLoading } = useSchedules(selectedStoreId, fromDate, toDate);
  const schedules = data?.schedules ?? [];
  const currentUserId = me?.profile.id;
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const schedulesByDate = schedules.reduce<Map<string, Schedule[]>>((map, schedule) => {
    const daySchedules = map.get(schedule.workDate) ?? [];

    daySchedules.push(schedule);
    map.set(schedule.workDate, daySchedules);

    return map;
  }, new Map<string, Schedule[]>());
  const currentMonthSchedules = schedules.filter((schedule) => schedule.workDate.startsWith(format(currentMonth, "yyyy-MM")));
  const myMonthSchedules = currentUserId
    ? currentMonthSchedules.filter((schedule) => schedule.workerId === currentUserId)
    : [];
  const myMonthHours = myMonthSchedules.reduce((total, schedule) => total + getScheduleDuration(schedule), 0);
  const activeWorkDays = new Set(currentMonthSchedules.map((schedule) => schedule.workDate)).size;
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const upcomingSchedules = sortSchedules(currentMonthSchedules.filter((schedule) => schedule.workDate >= todayKey));
  const sideSchedules = upcomingSchedules.length > 0 ? upcomingSchedules.slice(0, 4) : sortSchedules(currentMonthSchedules).slice(0, 4);

  return (
    <main className="dashboard">
      <section className="hero-row" aria-labelledby="schedule-title">
        <div>
          <p className="kicker">MONTHLY SCHEDULE</p>
          <h1 id="schedule-title">{selectedStore?.name ?? "선택 매장"} 근무표</h1>
        </div>
        <div className="month-status">
          <span>{selectedStore?.role === "OWNER" ? "사장님" : "알바생"}</span>
          <strong>{format(currentMonth, "yyyy년 M월")}</strong>
        </div>
      </section>

      <section className="metric-grid" aria-label="이번 달 요약">
        <article className="metric-card">
          <span>이번 달 내 근무</span>
          <strong>{myMonthSchedules.length}회</strong>
          <p>{getHoursLabel(myMonthHours)} 예정</p>
        </article>
        <article className="metric-card">
          <span>매장 근무일</span>
          <strong>{activeWorkDays}일</strong>
          <p>{currentMonthSchedules.length}건 등록</p>
        </article>
        <article className="metric-card highlight">
          <span>예상 급여</span>
          <strong>0원</strong>
          <p>{format(currentMonth, "M월")} 근무 기준</p>
        </article>
      </section>

      <section className="content-grid">
        <section className="calendar-card" aria-label="월간 근무표">
          <div className="card-head">
            <div>
              <p className="label">CALENDAR</p>
              <h2>{format(currentMonth, "yyyy년 M월")}</h2>
            </div>
            <div className="month-pills" aria-label="월 이동">
              <Link to={getMonthPath(addMonths(currentMonth, -1))}>이전</Link>
              <Link className="current" to={getMonthPath(new Date())}>
                오늘
              </Link>
              <Link to={getMonthPath(addMonths(currentMonth, 1))}>다음</Link>
            </div>
          </div>

          {error ? (
            <div className="empty-state schedule-message">
              <strong>근무표를 불러오지 못했습니다</strong>
              <span>{error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}</span>
            </div>
          ) : null}
          {isLoading ? (
            <div className="empty-state schedule-message">
              <strong>근무표 조회 중</strong>
              <span>{format(currentMonth, "M월")} 일정을 확인하고 있습니다.</span>
            </div>
          ) : null}

          <div className="calendar-grid">
            {weekdays.map((weekday) => (
              <span className="weekday" key={weekday}>
                {weekday}
              </span>
            ))}

            {calendarDays.map((date) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const daySchedules = schedulesByDate.get(dateKey) ?? [];
              const label = getDayLabel(daySchedules, currentUserId);
              const inCurrentMonth = isSameMonth(date, currentMonth);

              return (
                <Link
                  aria-label={`${format(date, "yyyy년 M월 d일")} 일간 근무표`}
                  className={getDayTone(daySchedules, currentUserId, inCurrentMonth, date)}
                  key={dateKey}
                  to={getScheduleDatePath(dateKey)}
                >
                  <strong>{format(date, "d")}</strong>
                  {label ? <span>{label}</span> : null}
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="side-stack" aria-label="근무 요약">
          <section className="side-card today-card">
            <p className="label">SUMMARY</p>
            <h2>{myMonthSchedules.length > 0 ? getHoursLabel(myMonthHours) : "근무 없음"}</h2>
            <span>{myMonthSchedules.length > 0 ? `${myMonthSchedules.length}회 예정` : "이번 달 내 근무 일정"}</span>
            <div className="mini-people">
              <strong>{selectedStore?.role ?? "STORE"}</strong>
              <strong>{format(currentMonth, "yyyy.MM")}</strong>
            </div>
          </section>

          <section className="side-card">
            <div className="card-head compact">
              <h3>다가오는 근무</h3>
            </div>
            {sideSchedules.length > 0 ? (
              <div className="request-list">
                {sideSchedules.map((schedule) => (
                  <article key={schedule.id}>
                    <div>
                      <strong>
                        {format(new Date(`${schedule.workDate}T00:00:00`), "M월 d일")} · {schedule.workerName}
                      </strong>
                      <span>
                        {getTimeLabel(schedule.startTime)} - {getTimeLabel(schedule.endTime)}
                      </span>
                    </div>
                    <p className="badge">{schedule.workerId === currentUserId ? "내 근무" : "매장"}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>등록된 근무 없음</strong>
                <span>{format(currentMonth, "M월")} 근무 일정이 없습니다.</span>
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
