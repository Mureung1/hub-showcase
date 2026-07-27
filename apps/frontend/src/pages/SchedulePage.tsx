import {
  addMonths,
  endOfMonth,
  format,
  isSameMonth,
} from "date-fns";
import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMe } from "../features/auth";
import { usePayrollSummary } from "../features/payroll";
import {
  useCreateRecurringSchedules,
  getCalendarDateRange,
  getDayLabel,
  getDayTone,
  getHoursLabel,
  getMonthlyScheduleSummary,
  getScheduleDuration,
  groupSchedulesByDate,
  parseMonthParam,
  Schedule,
  sortMonthlySchedules,
  useSchedules
} from "../features/schedule";
import { useWorkers } from "../features/worker";
import { getScheduleDatePath, ROUTES } from "../shared/routes";
import { getSelectedStoreId } from "../shared/utils";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const weekdayOptions = [
  { value: 0, label: "일요일" },
  { value: 1, label: "월요일" },
  { value: 2, label: "화요일" },
  { value: 3, label: "수요일" },
  { value: 4, label: "목요일" },
  { value: 5, label: "금요일" },
  { value: 6, label: "토요일" }
];

const currencyFormatter = new Intl.NumberFormat("ko-KR");

type RecurringScheduleFormState = {
  workerId: string;
  weekday: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  position: string;
};

function getMonthPath(date: Date) {
  return `${ROUTES.schedule}?month=${format(date, "yyyy-MM")}`;
}

function getTimeLabel(time: string) {
  return time.slice(0, 5);
}

function getInputTimeValue(time: string | null) {
  return time ? time.slice(0, 5) : "";
}

function getCurrencyLabel(amount: number) {
  return `${currencyFormatter.format(amount)}원`;
}

function getDefaultRecurringFormState(currentMonth: Date): RecurringScheduleFormState {
  return {
    workerId: "",
    weekday: "",
    startDate: format(currentMonth, "yyyy-MM-dd"),
    endDate: format(endOfMonth(currentMonth), "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    position: ""
  };
}

export function SchedulePage() {
  const [searchParams] = useSearchParams();
  const { data: me } = useMe();
  const selectedStoreId = getSelectedStoreId();
  const selectedStore = me?.stores.find((store) => store.id === selectedStoreId);
  const isOwner = selectedStore?.role === "OWNER";
  const currentMonth = parseMonthParam(searchParams.get("month"));
  const currentMonthKey = format(currentMonth, "yyyy-MM");
  const [recurringFormState, setRecurringFormState] = useState<RecurringScheduleFormState>(() =>
    getDefaultRecurringFormState(currentMonth)
  );
  const [recurringMessage, setRecurringMessage] = useState<string | null>(null);
  const { calendarDays, calendarEnd, calendarStart, fromDate, toDate } = getCalendarDateRange(currentMonth);
  const payrollFromDate = format(currentMonth, "yyyy-MM-dd");
  const payrollToDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");
  const { data, error, isLoading } = useSchedules(selectedStoreId, fromDate, toDate);
  const {
    data: payrollSummary,
    error: payrollError,
    isLoading: isPayrollLoading
  } = usePayrollSummary(selectedStoreId, payrollFromDate, payrollToDate);
  const { data: workersData, error: workersError, isLoading: isWorkersLoading } = useWorkers(selectedStoreId, isOwner);
  const createRecurringSchedulesMutation = useCreateRecurringSchedules(selectedStoreId);
  const schedules = data?.schedules ?? [];
  const workers = workersData?.workers ?? [];
  const currentUserId = me?.profile.id;
  const schedulesByDate = groupSchedulesByDate(schedules);
  const { activeWorkDays, currentMonthSchedules, myMonthHours, myMonthSchedules } = getMonthlyScheduleSummary(
    schedules,
    currentMonth,
    currentUserId
  );
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const upcomingSchedules = sortMonthlySchedules(currentMonthSchedules.filter((schedule) => schedule.workDate >= todayKey));
  const sideSchedules =
    upcomingSchedules.length > 0 ? upcomingSchedules.slice(0, 4) : sortMonthlySchedules(currentMonthSchedules).slice(0, 4);
  const payrollDescription = payrollError
    ? "급여 계산 실패"
    : payrollSummary?.missingWageCount
      ? `시급 미등록 ${payrollSummary.missingWageCount}건 포함`
      : payrollSummary?.scope === "STORE"
        ? `${payrollSummary.scheduleCount}건 · 매장 전체`
        : `${getHoursLabel(payrollSummary?.totalHours ?? 0)} · 내 근무`;

  useEffect(() => {
    setRecurringFormState((current) => ({
      ...current,
      startDate: format(currentMonth, "yyyy-MM-dd"),
      endDate: format(endOfMonth(currentMonth), "yyyy-MM-dd")
    }));
    setRecurringMessage(null);
  }, [currentMonthKey]);

  function handleRecurringWorkerChange(workerId: string) {
    const selectedWorker = workers.find((worker) => worker.userId === workerId);

    setRecurringFormState((current) => ({
      ...current,
      workerId,
      startTime: getInputTimeValue(selectedWorker?.defaultWorkStartTime ?? null),
      endTime: getInputTimeValue(selectedWorker?.defaultWorkEndTime ?? null)
    }));
    setRecurringMessage(null);
  }

  function handleRecurringFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecurringMessage(null);

    if (!recurringFormState.workerId) {
      setRecurringMessage("알바생을 선택해주세요.");
      return;
    }

    if (recurringFormState.weekday === "") {
      setRecurringMessage("요일을 선택해주세요.");
      return;
    }

    createRecurringSchedulesMutation.mutate(
      {
        workerId: recurringFormState.workerId,
        weekday: Number(recurringFormState.weekday),
        startDate: recurringFormState.startDate,
        endDate: recurringFormState.endDate,
        startTime: recurringFormState.startTime,
        endTime: recurringFormState.endTime,
        position: recurringFormState.position.trim() || null
      },
      {
        onSuccess: (response) => {
          setRecurringFormState(getDefaultRecurringFormState(currentMonth));
          setRecurringMessage(`${response.schedules.length}건의 반복 근무가 등록되었습니다.`);
        }
      }
    );
  }

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
          <strong>{isPayrollLoading ? "계산 중" : getCurrencyLabel(payrollSummary?.estimatedPay ?? 0)}</strong>
          <p>{payrollDescription}</p>
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

          {isOwner ? (
            <section className="side-card">
              <div className="card-head compact">
                <h3>반복 근무 등록</h3>
              </div>

              {isWorkersLoading ? (
                <div className="empty-state">
                  <strong>알바생 조회 중</strong>
                  <span>등록 가능한 알바생을 확인하고 있습니다.</span>
                </div>
              ) : null}

              {workersError ? (
                <div className="empty-state">
                  <strong>알바생을 불러오지 못했습니다</strong>
                  <span>{workersError instanceof Error ? workersError.message : "잠시 후 다시 시도해주세요."}</span>
                </div>
              ) : null}

              {!isWorkersLoading && !workersError && workers.length === 0 ? (
                <div className="empty-state">
                  <strong>등록할 알바생이 없습니다</strong>
                  <span>알바생 관리에서 매장 알바생을 먼저 연결해주세요.</span>
                  <Link className="secondary-button inline-empty-link" to={ROUTES.workers}>
                    알바생 관리
                  </Link>
                </div>
              ) : null}

              {workers.length > 0 ? (
                <form className="schedule-create-form" onSubmit={handleRecurringFormSubmit}>
                  <label>
                    <span>알바생</span>
                    <select
                      onChange={(event) => handleRecurringWorkerChange(event.target.value)}
                      required
                      value={recurringFormState.workerId}
                    >
                      <option value="">알바생 선택</option>
                      {workers.map((worker) => (
                        <option key={worker.userId} value={worker.userId}>
                          {worker.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>요일</span>
                    <select
                      onChange={(event) =>
                        setRecurringFormState((current) => ({
                          ...current,
                          weekday: event.target.value
                        }))
                      }
                      required
                      value={recurringFormState.weekday}
                    >
                      <option value="">요일 선택</option>
                      {weekdayOptions.map((weekday) => (
                        <option key={weekday.value} value={weekday.value}>
                          {weekday.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="schedule-time-row">
                    <label>
                      <span>시작일</span>
                      <input
                        onChange={(event) =>
                          setRecurringFormState((current) => ({
                            ...current,
                            startDate: event.target.value
                          }))
                        }
                        required
                        type="date"
                        value={recurringFormState.startDate}
                      />
                    </label>
                    <label>
                      <span>종료일</span>
                      <input
                        onChange={(event) =>
                          setRecurringFormState((current) => ({
                            ...current,
                            endDate: event.target.value
                          }))
                        }
                        required
                        type="date"
                        value={recurringFormState.endDate}
                      />
                    </label>
                  </div>

                  <div className="schedule-time-row">
                    <label>
                      <span>시작</span>
                      <input
                        onChange={(event) =>
                          setRecurringFormState((current) => ({
                            ...current,
                            startTime: event.target.value
                          }))
                        }
                        required
                        type="time"
                        value={recurringFormState.startTime}
                      />
                    </label>
                    <label>
                      <span>종료</span>
                      <input
                        onChange={(event) =>
                          setRecurringFormState((current) => ({
                            ...current,
                            endTime: event.target.value
                          }))
                        }
                        required
                        type="time"
                        value={recurringFormState.endTime}
                      />
                    </label>
                  </div>

                  <label>
                    <span>포지션</span>
                    <input
                      maxLength={40}
                      onChange={(event) =>
                        setRecurringFormState((current) => ({
                          ...current,
                          position: event.target.value
                        }))
                      }
                      placeholder="오픈, 미들, 마감"
                      value={recurringFormState.position}
                    />
                  </label>

                  {createRecurringSchedulesMutation.error ? (
                    <p className="form-error">
                      {createRecurringSchedulesMutation.error instanceof Error
                        ? createRecurringSchedulesMutation.error.message
                        : "반복 근무를 등록하지 못했습니다."}
                    </p>
                  ) : null}
                  {recurringMessage ? (
                    <p className={recurringMessage.includes("등록되었습니다") ? "form-success" : "form-error"}>
                      {recurringMessage}
                    </p>
                  ) : null}

                  <button className="primary-button" disabled={createRecurringSchedulesMutation.isPending} type="submit">
                    {createRecurringSchedulesMutation.isPending ? "등록 중" : "반복 근무 등록"}
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
