import { addDays, format } from "date-fns";
import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMe } from "../features/auth";
import { Schedule, useCreateSchedule, useDailySchedules } from "../features/schedule";
import { useWorkers } from "../features/worker";
import { getScheduleDatePath, ROUTES } from "../shared/routes";
import { getSelectedStoreId } from "../shared/utils";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

type ScheduleFormState = {
  workerId: string;
  startTime: string;
  endTime: string;
  position: string;
  memo: string;
};

const emptyScheduleForm: ScheduleFormState = {
  workerId: "",
  startTime: "",
  endTime: "",
  position: "",
  memo: ""
};

function parseDateParam(dateParam: string | undefined) {
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return null;
  }

  const [yearText, monthText, dayText] = dateParam.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(year, monthIndex, day);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) {
    return null;
  }

  return date;
}

function getTimeLabel(time: string) {
  return time.slice(0, 5);
}

function getInputTimeValue(time: string | null) {
  return time ? time.slice(0, 5) : "";
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

function sortSchedules(schedules: Schedule[]) {
  return [...schedules].sort((first, second) => {
    const timeCompare = first.startTime.localeCompare(second.startTime);

    if (timeCompare !== 0) {
      return timeCompare;
    }

    return first.workerName.localeCompare(second.workerName);
  });
}

function getDateTitle(date: Date) {
  return `${format(date, "yyyy년 M월 d일")} ${weekdays[date.getDay()]}요일`;
}

export function ScheduleDatePage() {
  const { date: dateParam } = useParams();
  const selectedDate = parseDateParam(dateParam);
  const selectedStoreId = getSelectedStoreId();
  const { data: me } = useMe();
  const selectedStore = me?.stores.find((store) => store.id === selectedStoreId);
  const isOwner = selectedStore?.role === "OWNER";
  const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const { data, error, isLoading } = useDailySchedules(selectedStoreId, dateKey, Boolean(selectedDate));
  const { data: workersData, error: workersError, isLoading: isWorkersLoading } = useWorkers(selectedStoreId, isOwner);
  const createScheduleMutation = useCreateSchedule(selectedStoreId);
  const [formState, setFormState] = useState<ScheduleFormState>(emptyScheduleForm);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const schedules = sortSchedules(data?.schedules ?? []);
  const workers = workersData?.workers ?? [];
  const currentUserId = me?.profile.id;
  const mySchedules = currentUserId ? schedules.filter((schedule) => schedule.workerId === currentUserId) : [];
  const totalHours = schedules.reduce((total, schedule) => total + getScheduleDuration(schedule), 0);
  const firstStartTime = schedules[0]?.startTime;
  const lastEndTime = schedules.reduce<string | null>((latest, schedule) => {
    if (!latest || schedule.endTime > latest) {
      return schedule.endTime;
    }

    return latest;
  }, null);

  function handleWorkerChange(workerId: string) {
    const selectedWorker = workers.find((worker) => worker.userId === workerId);

    setFormState((current) => ({
      ...current,
      workerId,
      startTime: getInputTimeValue(selectedWorker?.defaultWorkStartTime ?? null),
      endTime: getInputTimeValue(selectedWorker?.defaultWorkEndTime ?? null)
    }));
    setFormMessage(null);
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    if (!dateKey || !formState.workerId) {
      setFormMessage("알바생을 선택해주세요.");
      return;
    }

    createScheduleMutation.mutate(
      {
        workerId: formState.workerId,
        workDate: dateKey,
        startTime: formState.startTime,
        endTime: formState.endTime,
        position: formState.position.trim() || null,
        memo: formState.memo.trim() || null
      },
      {
        onSuccess: () => {
          setFormState(emptyScheduleForm);
          setFormMessage("근무 일정이 등록되었습니다.");
        }
      }
    );
  }

  if (!selectedDate) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">DAILY SCHEDULE</p>
          <h1>잘못된 날짜</h1>
          <div className="empty-state">
            <strong>날짜를 확인해주세요</strong>
            <span>일간 근무표 주소는 YYYY-MM-DD 형식이어야 합니다.</span>
          </div>
          <div className="auth-actions-row">
            <Link className="secondary-button" to={ROUTES.schedule}>
              월간 근무표
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <section className="hero-row" aria-labelledby="daily-schedule-title">
        <div>
          <p className="kicker">DAILY SCHEDULE</p>
          <h1 id="daily-schedule-title">{getDateTitle(selectedDate)}</h1>
        </div>
        <div className="month-status">
          <span>{selectedStore?.name ?? "선택 매장"}</span>
          <strong>{selectedStore?.role === "OWNER" ? "사장님" : "알바생"}</strong>
        </div>
      </section>

      <section className="content-grid daily-content-grid">
        <section className="calendar-card daily-card" aria-label="일간 근무표 상세">
          <div className="card-head">
            <div>
              <p className="label">TIMELINE</p>
              <h2>{schedules.length}건 근무</h2>
            </div>
            <p className="daily-summary">
              {getHoursLabel(totalHours)} · 내 근무 {mySchedules.length}건
            </p>
          </div>

          {isLoading ? (
            <div className="empty-state schedule-message">
              <strong>근무표 조회 중</strong>
              <span>{format(selectedDate, "M월 d일")} 일정을 확인하고 있습니다.</span>
            </div>
          ) : null}

          {error ? (
            <div className="empty-state schedule-message">
              <strong>근무표를 불러오지 못했습니다</strong>
              <span>{error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}</span>
            </div>
          ) : null}

          {!isLoading && !error && schedules.length === 0 ? (
            <div className="empty-state">
              <strong>등록된 근무 없음</strong>
              <span>이 날짜의 근무 일정이 없습니다.</span>
            </div>
          ) : null}

          {schedules.length > 0 ? (
            <div className="daily-timeline">
              {schedules.map((schedule) => {
                const isMySchedule = schedule.workerId === currentUserId;

                return (
                  <article className={`daily-shift ${isMySchedule ? "mine" : ""}`.trim()} key={schedule.id}>
                    <div className="timeline-marker" aria-hidden="true" />
                    <div className="shift-time">
                      <strong>
                        {getTimeLabel(schedule.startTime)} - {getTimeLabel(schedule.endTime)}
                      </strong>
                      <span>{getHoursLabel(getScheduleDuration(schedule))}</span>
                    </div>
                    <div className="shift-main">
                      <strong>{schedule.workerName}</strong>
                      <span>{schedule.position ?? "포지션 없음"}</span>
                      {schedule.memo ? <p>{schedule.memo}</p> : null}
                    </div>
                    <p className="badge">{isMySchedule ? "내 근무" : "매장"}</p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <aside className="side-stack" aria-label="일간 근무 요약">
          <section className="side-card today-card">
            <p className="label">DAY SUMMARY</p>
            <h2>{getHoursLabel(totalHours)}</h2>
            <span>
              {schedules.length}건 · 내 근무 {mySchedules.length}건
            </span>
            <div className="daily-summary-grid">
              <div>
                <span>첫 시작</span>
                <strong>{firstStartTime ? getTimeLabel(firstStartTime) : "-"}</strong>
              </div>
              <div>
                <span>마지막 종료</span>
                <strong>{lastEndTime ? getTimeLabel(lastEndTime) : "-"}</strong>
              </div>
            </div>
          </section>

          <section className="side-card">
            <div className="card-head compact">
              <h3>날짜 이동</h3>
            </div>
            <div className="daily-navigation">
              <Link className="secondary-button" to={getScheduleDatePath(format(addDays(selectedDate, -1), "yyyy-MM-dd"))}>
                이전날
              </Link>
              <Link className="secondary-button" to={ROUTES.schedule}>
                월간 근무표
              </Link>
              <Link className="secondary-button" to={getScheduleDatePath(format(addDays(selectedDate, 1), "yyyy-MM-dd"))}>
                다음날
              </Link>
            </div>
          </section>

          {isOwner ? (
            <section className="side-card">
              <div className="card-head compact">
                <h3>근무 등록</h3>
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
                <form className="schedule-create-form" onSubmit={handleFormSubmit}>
                  <label>
                    <span>알바생</span>
                    <select
                      onChange={(event) => handleWorkerChange(event.target.value)}
                      required
                      value={formState.workerId}
                    >
                      <option value="">알바생 선택</option>
                      {workers.map((worker) => (
                        <option key={worker.userId} value={worker.userId}>
                          {worker.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="schedule-time-row">
                    <label>
                      <span>시작</span>
                      <input
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            startTime: event.target.value
                          }))
                        }
                        required
                        type="time"
                        value={formState.startTime}
                      />
                    </label>
                    <label>
                      <span>종료</span>
                      <input
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            endTime: event.target.value
                          }))
                        }
                        required
                        type="time"
                        value={formState.endTime}
                      />
                    </label>
                  </div>

                  <label>
                    <span>포지션</span>
                    <input
                      maxLength={40}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          position: event.target.value
                        }))
                      }
                      placeholder="오픈, 미들, 마감"
                      value={formState.position}
                    />
                  </label>

                  <label>
                    <span>메모</span>
                    <textarea
                      maxLength={200}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          memo: event.target.value
                        }))
                      }
                      placeholder="전달할 내용"
                      rows={3}
                      value={formState.memo}
                    />
                  </label>

                  {createScheduleMutation.error ? (
                    <p className="form-error">
                      {createScheduleMutation.error instanceof Error
                        ? createScheduleMutation.error.message
                        : "근무 일정을 등록하지 못했습니다."}
                    </p>
                  ) : null}
                  {formMessage ? <p className="form-success">{formMessage}</p> : null}

                  <button className="primary-button" disabled={createScheduleMutation.isPending} type="submit">
                    {createScheduleMutation.isPending ? "등록 중" : "근무 등록"}
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
