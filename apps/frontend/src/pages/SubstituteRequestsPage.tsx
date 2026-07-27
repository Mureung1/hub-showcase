import { format } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMe } from "../features/auth";
import { useApplySubstituteRequest, useSubstituteRequests } from "../features/substitute";
import { getScheduleDatePath, ROUTES } from "../shared/routes";
import { getSelectedStoreId } from "../shared/utils";

function getTimeLabel(time: string) {
  return time.slice(0, 5);
}

function getDateLabel(date: string) {
  return format(new Date(`${date}T00:00:00`), "M월 d일");
}

export function SubstituteRequestsPage() {
  const { data: me, isLoading: isMeLoading } = useMe();
  const selectedStoreId = getSelectedStoreId();
  const selectedStore = me?.stores.find((store) => store.id === selectedStoreId);
  const isOwner = selectedStore?.role === "OWNER";
  const isWorker = selectedStore?.role === "WORKER";
  const { data, error, isLoading } = useSubstituteRequests(selectedStoreId);
  const applySubstituteRequestMutation = useApplySubstituteRequest();
  const [message, setMessage] = useState<string | null>(null);
  const substituteRequests = data?.substituteRequests ?? [];
  const pageTitle = isOwner ? "매장 공개 대타 요청" : "신청 가능한 대타 요청";
  const emptyTitle = isOwner ? "진행 중인 공개 요청이 없습니다." : "신청 가능한 대타 요청이 없습니다.";
  const emptyDescription = isOwner
    ? "알바생이 등록한 공개 요청이 생기면 이곳에 표시됩니다."
    : "오늘 이후 다른 알바생이 공개한 요청이 생기면 이곳에 표시됩니다.";

  function handleApply(requestId: string) {
    setMessage(null);
    applySubstituteRequestMutation.mutate(requestId, {
      onSuccess: () => {
        setMessage("대타 요청에 신청했습니다. 사장님 승인 대기 상태로 변경되었습니다.");
      }
    });
  }

  if (isMeLoading) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">SUBSTITUTE</p>
          <h1>대타 요청을 확인 중</h1>
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

  return (
    <main className="dashboard substitute-dashboard">
      <section className="hero-row" aria-labelledby="substitute-list-title">
        <div>
          <p className="kicker">SUBSTITUTE</p>
          <h1 id="substitute-list-title">{pageTitle}</h1>
        </div>
        <div className="month-status">
          <span>{selectedStore.name}</span>
          <strong>{isOwner ? "사장님" : "알바생"}</strong>
        </div>
      </section>

      <section className="content-grid">
        <section className="calendar-card" aria-label="공개 대타 요청 목록">
          <div className="card-head">
            <div>
              <p className="label">OPEN REQUESTS</p>
              <h2>{substituteRequests.length}건</h2>
            </div>
            {isWorker ? (
              <Link className="primary-button inline-empty-link" to={ROUTES.newSubstituteRequest}>
                요청 등록
              </Link>
            ) : null}
          </div>

          {isLoading ? (
            <div className="empty-state schedule-message">
              <strong>대타 요청 조회 중</strong>
              <span>오늘 이후 공개 요청을 확인하고 있습니다.</span>
            </div>
          ) : null}

          {error ? (
            <div className="empty-state schedule-message">
              <strong>대타 요청을 불러오지 못했습니다</strong>
              <span>{error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}</span>
            </div>
          ) : null}

          {applySubstituteRequestMutation.error ? (
            <p className="form-error schedule-message">
              {applySubstituteRequestMutation.error instanceof Error
                ? applySubstituteRequestMutation.error.message
                : "대타 요청 신청에 실패했습니다."}
            </p>
          ) : null}
          {message ? <p className="form-success schedule-message">{message}</p> : null}

          {!isLoading && !error && substituteRequests.length === 0 ? (
            <div className="empty-state">
              <strong>{emptyTitle}</strong>
              <span>{emptyDescription}</span>
              {isWorker ? (
                <Link className="secondary-button inline-empty-link" to={ROUTES.newSubstituteRequest}>
                  요청 등록
                </Link>
              ) : null}
            </div>
          ) : null}

          {substituteRequests.length > 0 ? (
            <div className="request-list substitute-request-list">
              {substituteRequests.map((request) => (
                <article key={request.id}>
                  <div>
                    <strong>
                      {getDateLabel(request.workDate)} · {request.requesterName}
                    </strong>
                    <span>
                      {getTimeLabel(request.startTime)} - {getTimeLabel(request.endTime)}
                      {" · "}
                      {request.position ?? "포지션 없음"}
                    </span>
                    <p className="request-reason">{request.reason}</p>
                  </div>
                  <div className="request-card-actions">
                    {isWorker ? (
                      <button
                        className="primary-button inline-empty-link"
                        disabled={applySubstituteRequestMutation.isPending}
                        onClick={() => handleApply(request.id)}
                        type="button"
                      >
                        {applySubstituteRequestMutation.isPending ? "신청 중" : "신청"}
                      </button>
                    ) : (
                      <p className="badge">공개</p>
                    )}
                    <Link className="text-button" to={getScheduleDatePath(request.workDate)}>
                      근무 보기
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="side-stack" aria-label="대타 요청 요약">
          <section className="side-card today-card">
            <p className="label">SUMMARY</p>
            <h2>{substituteRequests.length}건</h2>
            <span>{isOwner ? "매장 전체 공개 요청" : "내가 신청할 수 있는 요청"}</span>
            <div className="mini-people">
              <strong>OPEN</strong>
              <strong>{selectedStore.name}</strong>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
