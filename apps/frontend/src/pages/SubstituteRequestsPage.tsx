import { format } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMe } from "../features/auth";
import {
  useApplySubstituteRequest,
  useApproveSubstituteRequest,
  useRejectSubstituteRequest,
  useSubstituteRequests
} from "../features/substitute";
import { SubstituteRequestListItem } from "../features/substitute";
import { StatusNotice } from "../shared/components";
import { getScheduleDatePath, ROUTES } from "../shared/routes";
import { getSelectedStoreId } from "../shared/utils";

function getTimeLabel(time: string) {
  return time.slice(0, 5);
}

function getDateLabel(date: string) {
  return format(new Date(`${date}T00:00:00`), "M월 d일");
}

function getStatusLabel(request: SubstituteRequestListItem, isOwner: boolean) {
  if (request.status === "PENDING_APPROVAL") {
    return isOwner ? "승인 대기" : "신청 중";
  }

  return isOwner ? "공개" : "신청 가능";
}

export function SubstituteRequestsPage() {
  const { data: me, isLoading: isMeLoading } = useMe();
  const selectedStoreId = getSelectedStoreId();
  const selectedStore = me?.stores.find((store) => store.id === selectedStoreId);
  const isOwner = selectedStore?.role === "OWNER";
  const isWorker = selectedStore?.role === "WORKER";
  const { data, error, isLoading } = useSubstituteRequests(selectedStoreId);
  const applySubstituteRequestMutation = useApplySubstituteRequest();
  const approveSubstituteRequestMutation = useApproveSubstituteRequest();
  const rejectSubstituteRequestMutation = useRejectSubstituteRequest();
  const [message, setMessage] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const substituteRequests = data?.substituteRequests ?? [];
  const pageTitle = isOwner ? "매장 공개 대타 요청" : "신청 가능한 대타 요청";
  const emptyTitle = isOwner ? "진행 중인 공개 요청이 없습니다." : "신청 가능한 대타 요청이 없습니다.";
  const emptyDescription = isOwner
    ? "알바생이 등록하거나 신청한 공개 요청이 생기면 이곳에 표시됩니다."
    : "오늘 이후 다른 알바생이 공개한 요청이 생기면 이곳에 표시됩니다.";
  const pendingCount = substituteRequests.filter((request) => request.status === "PENDING_APPROVAL").length;
  const openCount = substituteRequests.filter((request) => request.status === "OPEN").length;

  function handleApply(requestId: string) {
    setMessage(null);
    applySubstituteRequestMutation.mutate(requestId, {
      onSuccess: () => {
        setMessage("대타 요청에 신청했습니다. 사장님 승인 대기 상태로 변경되었습니다.");
      }
    });
  }

  function handleApprove(requestId: string) {
    setMessage(null);
    approveSubstituteRequestMutation.mutate(requestId, {
      onSuccess: () => {
        setMessage("대타 요청을 승인했습니다.");
      }
    });
  }

  function handleReject(requestId: string) {
    setMessage(null);
    const rejectReason = rejectReasons[requestId]?.trim() ?? "";

    if (!rejectReason) {
      setMessage("거절 사유를 입력해주세요.");
      return;
    }

    rejectSubstituteRequestMutation.mutate(
      {
        requestId,
        values: {
          rejectReason
        }
      },
      {
        onSuccess: () => {
          setRejectReasons((current) => ({
            ...current,
            [requestId]: ""
          }));
          setMessage("대타 요청을 거절했습니다.");
        }
      }
    );
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
              <p className="label">REQUESTS</p>
              <h2>{substituteRequests.length}건</h2>
            </div>
            {isWorker ? (
              <Link className="primary-button inline-empty-link" to={ROUTES.newSubstituteRequest}>
                요청 등록
              </Link>
            ) : null}
          </div>

          {isLoading ? (
            <StatusNotice
              className="schedule-message"
              description="오늘 이후 공개 요청을 확인하고 있습니다."
              title="대타 요청 조회 중"
              variant="loading"
            />
          ) : null}

          {error ? (
            <StatusNotice
              className="schedule-message"
              description={error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}
              title="대타 요청을 불러오지 못했습니다"
              variant="error"
            />
          ) : null}

          {applySubstituteRequestMutation.error ||
          approveSubstituteRequestMutation.error ||
          rejectSubstituteRequestMutation.error ? (
            <p className="form-error schedule-message">
              {applySubstituteRequestMutation.error instanceof Error
                ? applySubstituteRequestMutation.error.message
                : approveSubstituteRequestMutation.error instanceof Error
                  ? approveSubstituteRequestMutation.error.message
                  : rejectSubstituteRequestMutation.error instanceof Error
                    ? rejectSubstituteRequestMutation.error.message
                    : "대타 요청 처리에 실패했습니다."}
            </p>
          ) : null}
          {message ? (
            <p className={message.includes("입력") ? "form-error schedule-message" : "form-success schedule-message"}>
              {message}
            </p>
          ) : null}

          {!isLoading && !error && substituteRequests.length === 0 ? (
            <StatusNotice
              action={
                isWorker ? (
                  <Link className="secondary-button inline-empty-link" to={ROUTES.newSubstituteRequest}>
                    요청 등록
                  </Link>
                ) : null
              }
              description={emptyDescription}
              title={emptyTitle}
            />
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
                    {request.candidateWorkerName ? <span>후보 {request.candidateWorkerName}</span> : null}
                    <p className="request-reason">{request.reason}</p>
                  </div>
                  <div className="request-card-actions">
                    {isWorker && request.status === "OPEN" ? (
                      <button
                        className="primary-button inline-empty-link"
                        disabled={applySubstituteRequestMutation.isPending}
                        onClick={() => handleApply(request.id)}
                        type="button"
                      >
                        {applySubstituteRequestMutation.isPending ? "신청 중" : "신청"}
                      </button>
                    ) : (
                      <p className="badge">{getStatusLabel(request, Boolean(isOwner))}</p>
                    )}

                    {isOwner && request.status === "PENDING_APPROVAL" ? (
                      <div className="request-review-actions">
                        <button
                          className="primary-button"
                          disabled={approveSubstituteRequestMutation.isPending}
                          onClick={() => handleApprove(request.id)}
                          type="button"
                        >
                          {approveSubstituteRequestMutation.isPending ? "승인 중" : "승인"}
                        </button>
                        <textarea
                          maxLength={200}
                          onChange={(event) =>
                            setRejectReasons((current) => ({
                              ...current,
                              [request.id]: event.target.value
                            }))
                          }
                          placeholder="거절 사유"
                          rows={2}
                          value={rejectReasons[request.id] ?? ""}
                        />
                        <button
                          className="secondary-button"
                          disabled={rejectSubstituteRequestMutation.isPending}
                          onClick={() => handleReject(request.id)}
                          type="button"
                        >
                          {rejectSubstituteRequestMutation.isPending ? "거절 중" : "거절"}
                        </button>
                      </div>
                    ) : null}

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
            <span>{isOwner ? `공개 ${openCount}건 · 승인 대기 ${pendingCount}건` : "내가 신청할 수 있는 요청"}</span>
            <div className="mini-people">
              <strong>OPEN</strong>
              {isOwner ? <strong>PENDING</strong> : null}
              <strong>{selectedStore.name}</strong>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
