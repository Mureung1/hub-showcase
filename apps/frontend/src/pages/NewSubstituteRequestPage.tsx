import { endOfMonth, format, startOfMonth } from "date-fns";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMe } from "../features/auth";
import { getHoursLabel, getScheduleDuration, sortMonthlySchedules, useSchedules } from "../features/schedule";
import { Schedule } from "../features/schedule";
import { useCreateSubstituteRequest } from "../features/substitute";
import { getScheduleDatePath, ROUTES } from "../shared/routes";
import { getSelectedStoreId } from "../shared/utils";

function getTimeLabel(time: string) {
  return time.slice(0, 5);
}

function getScheduleLabel(schedule: Schedule) {
  const workDate = new Date(`${schedule.workDate}T00:00:00`);

  return `${format(workDate, "M월 d일")} ${getTimeLabel(schedule.startTime)}-${getTimeLabel(schedule.endTime)}`;
}

export function NewSubstituteRequestPage() {
  const { data: me, isLoading: isMeLoading } = useMe();
  const selectedStoreId = getSelectedStoreId();
  const selectedStore = me?.stores.find((store) => store.id === selectedStoreId);
  const isWorker = selectedStore?.role === "WORKER";
  const currentMonth = startOfMonth(new Date());
  const fromDate = format(currentMonth, "yyyy-MM-dd");
  const toDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const { data, error, isLoading } = useSchedules(selectedStoreId, fromDate, toDate, Boolean(isWorker));
  const createSubstituteRequestMutation = useCreateSubstituteRequest(selectedStoreId);
  const [scheduleId, setScheduleId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const currentUserId = me?.profile.id;
  const candidateSchedules = sortMonthlySchedules(
    (data?.schedules ?? []).filter((schedule) => schedule.workerId === currentUserId && schedule.workDate >= todayKey)
  );
  const selectedSchedule = candidateSchedules.find((schedule) => schedule.id === scheduleId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!scheduleId) {
      setMessage("대타 요청을 등록할 근무를 선택해주세요.");
      return;
    }

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setMessage("대타 요청 사유를 입력해주세요.");
      return;
    }

    createSubstituteRequestMutation.mutate(
      {
        scheduleId,
        reason: trimmedReason
      },
      {
        onSuccess: () => {
          setScheduleId("");
          setReason("");
          setMessage("공개 대타 요청이 등록되었습니다.");
        }
      }
    );
  }

  if (isMeLoading) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">SUBSTITUTE</p>
          <h1>대타 요청 정보를 확인 중</h1>
        </section>
      </main>
    );
  }

  if (!selectedStoreId || !selectedStore) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">SUBSTITUTE</p>
          <h1>매장을 먼저 선택해주세요.</h1>
        </section>
      </main>
    );
  }

  if (!isWorker) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">SUBSTITUTE</p>
          <h1>알바생만 요청을 등록할 수 있습니다.</h1>
          <div className="empty-state">
            <strong>대타 요청은 본인 근무를 다른 알바생에게 공개하는 기능입니다.</strong>
            <span>사장님은 대타 요청 목록과 승인 화면에서 요청을 관리합니다.</span>
          </div>
          <div className="auth-actions-row">
            <Link className="secondary-button" to={ROUTES.substituteRequests}>
              요청 목록
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard substitute-dashboard">
      <section className="hero-row" aria-labelledby="substitute-new-title">
        <div>
          <p className="kicker">SUBSTITUTE</p>
          <h1 id="substitute-new-title">대타 요청 등록</h1>
        </div>
        <div className="month-status">
          <span>{selectedStore.name}</span>
          <strong>{format(currentMonth, "yyyy년 M월")}</strong>
        </div>
      </section>

      <section className="content-grid">
        <section className="calendar-card" aria-label="대타 요청 등록 폼">
          <div className="card-head">
            <div>
              <p className="label">REQUEST</p>
              <h2>내 근무 선택</h2>
            </div>
            <Link className="secondary-button inline-empty-link" to={ROUTES.substituteRequests}>
              요청 목록
            </Link>
          </div>

          {isLoading ? (
            <div className="empty-state schedule-message">
              <strong>근무표 조회 중</strong>
              <span>대타 요청을 등록할 수 있는 내 근무를 확인하고 있습니다.</span>
            </div>
          ) : null}

          {error ? (
            <div className="empty-state schedule-message">
              <strong>근무표를 불러오지 못했습니다</strong>
              <span>{error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}</span>
            </div>
          ) : null}

          {!isLoading && !error && candidateSchedules.length === 0 ? (
            <div className="empty-state">
              <strong>요청 가능한 내 근무 없음</strong>
              <span>오늘 이후 등록된 내 근무가 있을 때 대타 요청을 등록할 수 있습니다.</span>
            </div>
          ) : null}

          {candidateSchedules.length > 0 ? (
            <form className="schedule-create-form substitute-form" onSubmit={handleSubmit}>
              <label>
                <span>대상 근무</span>
                <select onChange={(event) => setScheduleId(event.target.value)} required value={scheduleId}>
                  <option value="">근무 선택</option>
                  {candidateSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {getScheduleLabel(schedule)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>사유</span>
                <textarea
                  maxLength={200}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="개인 일정으로 근무가 어렵습니다."
                  required
                  rows={5}
                  value={reason}
                />
              </label>

              {createSubstituteRequestMutation.error ? (
                <p className="form-error">
                  {createSubstituteRequestMutation.error instanceof Error
                    ? createSubstituteRequestMutation.error.message
                    : "대타 요청을 등록하지 못했습니다."}
                </p>
              ) : null}
              {message ? (
                <p className={message.includes("등록되었습니다") ? "form-success" : "form-error"}>{message}</p>
              ) : null}

              <button className="primary-button" disabled={createSubstituteRequestMutation.isPending} type="submit">
                {createSubstituteRequestMutation.isPending ? "등록 중" : "공개 대타 요청 등록"}
              </button>
            </form>
          ) : null}
        </section>

        <aside className="side-stack" aria-label="선택 근무 요약">
          <section className="side-card today-card">
            <p className="label">SELECTED</p>
            <h2>{selectedSchedule ? getScheduleLabel(selectedSchedule) : "근무 선택"}</h2>
            <span>
              {selectedSchedule
                ? `${getHoursLabel(getScheduleDuration(selectedSchedule))} · ${selectedSchedule.position ?? "포지션 없음"}`
                : "오늘 이후 내 근무만 등록 가능"}
            </span>
            <div className="mini-people">
              <strong>OPEN</strong>
              <strong>공개 요청</strong>
            </div>
          </section>

          {selectedSchedule ? (
            <section className="side-card">
              <div className="card-head compact">
                <h3>근무 상세</h3>
                <Link to={getScheduleDatePath(selectedSchedule.workDate)}>보기</Link>
              </div>
              <div className="empty-state">
                <strong>{selectedSchedule.workerName}</strong>
                <span>
                  {getTimeLabel(selectedSchedule.startTime)} - {getTimeLabel(selectedSchedule.endTime)}
                </span>
              </div>
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
