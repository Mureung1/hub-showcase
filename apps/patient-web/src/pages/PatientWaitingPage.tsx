import { Clock3, Info, MapPinCheck, PauseCircle, TriangleAlert, UsersRound } from "lucide-react";
import { formatPatientCounts, type QueuePosition } from "@baro-jinryo/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";

interface PatientWaitingPageProps {
  waiting: QueuePosition | null;
  onCancel: () => void;
  onDefer: () => void;
}

export function PatientWaitingPage({ waiting, onCancel, onDefer }: PatientWaitingPageProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  if (!waiting || waiting.entry.status === "cancelled") {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="patient-state-page content-width">
          <div className="patient-empty-state">
            <Clock3 size={32} aria-hidden="true" />
            <h1>진행 중인 웨이팅이 없습니다</h1>
            <p>병원을 찾아 오늘 진료 대기열에 원격으로 참여할 수 있습니다.</p>
            <Link className="primary-link" to="/">
              병원 찾기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isEntryRequested = waiting.entry.status === "entry_requested";
  const isOnsite = waiting.entry.status === "onsite_waiting";
  const isHeld = waiting.entry.status === "held";
  const isPreparation = !isEntryRequested && !isOnsite && (waiting.position ?? 99) <= 6;
  const statusLabel = isEntryRequested
    ? "입장 요청"
    : isOnsite
      ? "현장 대기"
      : isHeld
        ? "보류"
        : "원격 대기";
  const StatusIcon = isEntryRequested
    ? TriangleAlert
    : isOnsite
      ? MapPinCheck
      : isHeld
        ? PauseCircle
        : Clock3;

  return (
    <div className="app-shell patient-app-shell">
      <AppHeader />
      <main className="patient-state-page">
        <section className="patient-clinic-heading">
          <div>
            <h1>서울이비인후과</h1>
            <p>
              이비인후과 · 접수번호 <strong>{waiting.entry.ticketNumber}</strong>
            </p>
          </div>
          <span className="status-badge">
            {formatPatientCounts(waiting.entry)} · 총 {waiting.entry.patientCount}명
          </span>
        </section>

        <section
          className={`patient-status-panel patient-status-panel--${isEntryRequested ? "warning" : isOnsite ? "onsite" : isHeld ? "held" : "remote"}`}
          aria-live="polite"
        >
          <div className="patient-status-title">
            <StatusIcon size={24} />
            <strong>{statusLabel}</strong>
            <span>
              {isEntryRequested
                ? "20분 이내 병원 데스크에서 접수해 주세요"
                : isOnsite
                  ? "병원에서 진료실 호출을 기다리고 있어요"
                  : isHeld
                    ? "병원에서 순서를 확인하고 있어요"
                    : isPreparation
                      ? "병원 방문을 준비해 주세요"
                      : "병원 밖에서 순서를 기다리고 있어요"}
            </span>
          </div>
          <div className="patient-position-grid">
            <div>
              <UsersRound size={22} />
              <span>현재 진료 대기 순서</span>
              <strong>{waiting.position ? `${waiting.position}번째` : "확인 중"}</strong>
            </div>
            <div>
              <Clock3 size={22} />
              <span>참고용 예상 대기</span>
              <strong>
                {waiting.estimatedMinutes === null ? "확인 중" : `약 ${waiting.estimatedMinutes}분`}
              </strong>
            </div>
          </div>
          <ol className="progress-steps" aria-label="웨이팅 진행 단계">
            {["원격 대기", "입장 요청", "현장 대기", "대기열 종료"].map((label, index) => {
              const currentStep = isOnsite ? 2 : isEntryRequested ? 1 : 0;
              const completed = index < currentStep;
              const current = index === currentStep;
              return (
                <li className={completed ? "is-complete" : current ? "is-current" : ""} key={label}>
                  <span>{completed ? "✓" : index + 1}</span>
                  <small>{label}</small>
                  {current && <em>현재 단계</em>}
                </li>
              );
            })}
          </ol>
          {isEntryRequested && (
            <div className="notice notice--warning">
              <Info size={20} />
              <div>
                <strong>도착 후 데스크에서 접수해 주세요</strong>
                <p>입장 요청 알림을 받은 시점부터 20분 안에 도착 확인이 필요합니다.</p>
              </div>
            </div>
          )}
          {isPreparation && (
            <div className="notice notice--info">
              <Info size={20} />
              <div>
                <strong>입장을 준비해 주세요</strong>
                <p>
                  현재 {waiting.position}번째이며 예상 대기시간은 약 {waiting.estimatedMinutes}
                  분입니다.
                </p>
              </div>
            </div>
          )}
          {!isOnsite && !isHeld && (
            <button
              className="secondary-button"
              type="button"
              onClick={onDefer}
              disabled={waiting.entry.deferred}
            >
              순서 {waiting.entry.deferred ? "미루기 사용 완료" : "1회 미루기"}
            </button>
          )}
          {!isOnsite && !isHeld && (
            <button
              className="quiet-danger-button"
              type="button"
              onClick={() => setShowCancelConfirm(true)}
            >
              웨이팅 취소
            </button>
          )}
          <p className="advisory-copy">
            <Info size={16} /> 예상 시간은 참고용이며 진료 상황에 따라 달라질 수 있습니다.
          </p>
        </section>
        {showCancelConfirm && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-confirm-title"
            >
              <h2 id="cancel-confirm-title">웨이팅을 취소할까요?</h2>
              <p>취소하면 현재 순번을 복구할 수 없습니다.</p>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  계속 대기
                </button>
                <button className="quiet-danger-button" type="button" onClick={onCancel}>
                  웨이팅 취소
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
