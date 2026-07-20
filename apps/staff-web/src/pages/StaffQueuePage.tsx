import type {
  QueueEntry,
  NotificationReceipt,
  PatientCategoryDefinition,
  PatientCounts,
  PatientInputMode,
  PatientRegistrationInput,
  QueueStatus,
  WaitingStatus,
} from "@baro-jinryo/shared";
import {
  calculatePatientCount,
  calculateQueuePositions,
  createEmptyPatientCounts,
  formatKoreanMobileNumber,
  formatPatientCounts,
  formatPositionRange,
} from "@baro-jinryo/shared";
import {
  ArrowDown,
  ArrowUp,
  CircleX,
  Building2,
  Clock3,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  Stethoscope,
  UserCheck,
  UsersRound,
  Wifi,
  MessageCircleMore,
  LogOut,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PatientCategorySettingsModal } from "../components/PatientCategorySettingsModal";
import { PatientCountStepper } from "../components/PatientCountStepper";

interface StaffQueuePageProps {
  entries: QueueEntry[];
  queueDate: string;
  patientCategories: PatientCategoryDefinition[];
  nextDayCategories: PatientCategoryDefinition[];
  patientInputMode: PatientInputMode;
  nextDayInputMode: PatientInputMode;
  queueStatus: QueueStatus;
  onAddOnsite: (
    phoneNumber: string,
    registration: PatientRegistrationInput,
  ) => Promise<NotificationReceipt>;
  onChangeQueueStatus: (status: QueueStatus) => Promise<void>;
  onChangeStatus: (id: string, status: WaitingStatus) => void;
  onHold: (id: string) => void;
  onRestore: (id: string, position?: number) => void;
  onReorder: (orderedWaitingIds: string[]) => void;
  onSavePatientConfiguration: (
    inputMode: PatientInputMode,
    categories: PatientCategoryDefinition[],
  ) => void;
  onRefresh: () => void;
  onOpenHospitalManagement: () => void;
  onSignOut: () => Promise<void>;
}

const statusLabels: Record<WaitingStatus, string> = {
  remote_waiting: "원격 대기",
  entry_requested: "입장 요청",
  onsite_waiting: "현장 대기",
  held: "보류",
  called: "진료실 호출",
  cancelled: "취소",
};

export function StaffQueuePage({
  entries,
  queueDate,
  patientCategories,
  nextDayCategories,
  patientInputMode,
  nextDayInputMode,
  queueStatus,
  onAddOnsite,
  onChangeQueueStatus,
  onChangeStatus,
  onHold,
  onRestore,
  onReorder,
  onSavePatientConfiguration,
  onRefresh,
  onOpenHospitalManagement,
  onSignOut,
}: StaffQueuePageProps) {
  const [showOnsiteForm, setShowOnsiteForm] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [counts, setCounts] = useState<PatientCounts>(() =>
    createEmptyPatientCounts(patientCategories),
  );
  const [totalOnlyCount, setTotalOnlyCount] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notificationReceipt, setNotificationReceipt] = useState<NotificationReceipt>();
  const [isSubmittingOnsite, setIsSubmittingOnsite] = useState(false);
  const [onsiteSubmitError, setOnsiteSubmitError] = useState("");
  const [queueStatusError, setQueueStatusError] = useState("");
  const [isChangingQueueStatus, setIsChangingQueueStatus] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [restorePosition, setRestorePosition] = useState(1);
  const rows = useMemo(() => calculateQueuePositions(entries), [entries]);
  const visibleRows = rows.filter(({ entry }) => !["called", "cancelled"].includes(entry.status));
  const activeQueueRows = rows.filter(({ position }) => position !== null);
  const selected = rows.find(({ entry }) => entry.id === selectedId);
  const totalPatients = activeQueueRows.reduce((sum, { entry }) => sum + entry.patientCount, 0);

  function moveActiveWaiting(id: string, direction: -1 | 1) {
    const activeIds = activeQueueRows.map(({ entry }) => entry.id);
    const index = activeIds.indexOf(id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= activeIds.length) return;
    const nextIds = [...activeIds];
    [nextIds[index], nextIds[targetIndex]] = [nextIds[targetIndex]!, nextIds[index]!];
    onReorder(nextIds);
  }

  async function submitOnsite() {
    const registration: PatientRegistrationInput =
      patientInputMode === "categorized"
        ? { inputMode: "categorized", patientCounts: counts }
        : { inputMode: "total_only", totalCount: totalOnlyCount };
    setIsSubmittingOnsite(true);
    setOnsiteSubmitError("");
    try {
      const notification = await onAddOnsite(phoneNumber, registration);
      setNotificationReceipt(notification);
      setCounts(createEmptyPatientCounts(patientCategories));
      setTotalOnlyCount(1);
      setPhoneNumber("");
      setShowOnsiteForm(false);
    } catch (error) {
      setOnsiteSubmitError(
        error instanceof Error
          ? error.message
          : "현장 접수를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmittingOnsite(false);
    }
  }

  const phoneNumberValid = /^01[016789]-?\d{3,4}-?\d{4}$/.test(phoneNumber.trim());
  const onsitePatientCount =
    patientInputMode === "categorized" ? calculatePatientCount(counts) : totalOnlyCount;

  async function toggleRemoteRegistration() {
    setIsChangingQueueStatus(true);
    setQueueStatusError("");
    try {
      await onChangeQueueStatus(queueStatus === "paused" ? "open" : "paused");
    } catch (error) {
      setQueueStatusError(
        error instanceof Error
          ? error.message
          : "원격 접수 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsChangingQueueStatus(false);
    }
  }

  return (
    <div className="staff-shell">
      <header className="staff-header">
        <a className="brand" href="http://127.0.0.1:5173">
          <span className="brand-mark">
            <Stethoscope size={20} />
          </span>
          바로진료 병원
        </a>
        <strong>서울이비인후과</strong>
        <div className="staff-account">
          <span>병원 관리자</span>
          <button type="button" title="로그아웃" onClick={() => void onSignOut()}>
            <LogOut size={18} />
            <span>로그아웃</span>
          </button>
        </div>
      </header>
      <aside className="staff-sidebar">
        <nav>
          <a className="is-active" href="#queue">
            <UsersRound size={20} />
            통합 대기열
          </a>
          <button type="button" onClick={() => setShowOnsiteForm(true)}>
            <Plus size={20} />
            현장 환자 등록
          </button>
          <button type="button" onClick={() => setShowCategorySettings(true)}>
            <Settings2 size={20} />
            환자 분류 설정
          </button>
          <button type="button" onClick={onOpenHospitalManagement}>
            <Building2 size={20} />
            병원 관리
          </button>
        </nav>
        <a href="http://127.0.0.1:5173">환자 화면 보기</a>
      </aside>
      <main className="staff-main" id="queue">
        <div className="staff-title-row">
          <div>
            <h1>통합 대기열</h1>
            <p>
              {formatQueueDate(queueDate)}{" "}
              <span className={`queue-operation queue-operation--${queueStatus}`}>
                <Wifi size={14} />
                {queueStatus === "open" ? "원격 웨이팅 운영 중" : "원격 웨이팅 일시 중지"}
              </span>
            </p>
          </div>
          <div>
            <button
              className="primary-button compact"
              type="button"
              onClick={() => setShowOnsiteForm(true)}
            >
              <Plus size={18} />
              현장 환자 등록
            </button>
            <button className="secondary-button compact" type="button" onClick={onRefresh}>
              <RefreshCw size={18} />
              새로고침
            </button>
            <button
              className={`queue-status-button queue-status-button--${queueStatus === "paused" ? "start" : "stop"}`}
              type="button"
              disabled={isChangingQueueStatus}
              onClick={() => void toggleRemoteRegistration()}
            >
              {queueStatus === "paused" ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
              {isChangingQueueStatus
                ? "변경 중"
                : queueStatus === "paused"
                  ? "원격 접수 시작"
                  : "원격 접수 중지"}
            </button>
          </div>
        </div>
        {queueStatusError && (
          <div className="notice notice--error" role="alert">
            <CircleX size={20} />
            <div>
              <strong>원격 접수 상태를 변경하지 못했습니다</strong>
              <p>{queueStatusError}</p>
            </div>
          </div>
        )}
        <section className="queue-metrics" aria-label="대기열 요약">
          <div>
            <UsersRound />
            <span>대기 환자</span>
            <strong>{totalPatients}명</strong>
          </div>
          <div>
            <Wifi />
            <span>원격</span>
            <strong>
              {activeQueueRows.filter(({ entry }) => entry.source === "remote").length}건
            </strong>
          </div>
          <div>
            <UserCheck />
            <span>현장</span>
            <strong>
              {activeQueueRows.filter(({ entry }) => entry.source === "onsite").length}건
            </strong>
          </div>
          <div>
            <Clock3 />
            <span>평균 진료</span>
            <strong>10분</strong>
          </div>
        </section>
        {queueStatus === "paused" && (
          <div className="notice notice--warning">
            <PauseCircle size={20} />
            <div>
              <strong>원격 접수가 일시 중지되었습니다</strong>
              <p>현장 접수와 기존 대기열 처리는 계속할 수 있습니다.</p>
            </div>
          </div>
        )}
        <section className="queue-table-wrap">
          {visibleRows.length === 0 ? (
            <div className="staff-empty">
              <UsersRound size={28} />
              <strong>현재 대기 환자가 없습니다</strong>
              <p>현장 환자를 등록하거나 원격 접수를 열어 주세요.</p>
            </div>
          ) : (
            <table className="queue-table">
              <thead>
                <tr>
                  <th>대기 팀</th>
                  <th>실제 환자 순서</th>
                  <th>접수번호</th>
                  <th>유형</th>
                  <th>가족 인원</th>
                  <th>현재 상태</th>
                  <th>등록 시각</th>
                  <th>다음 동작</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    className={selectedId === row.entry.id ? "is-selected" : ""}
                    key={row.entry.id}
                    onClick={() => setSelectedId(row.entry.id)}
                  >
                    <td>{row.teamNumber ? `${row.teamNumber}팀` : "-"}</td>
                    <td>{formatPositionRange(row)}</td>
                    <td>
                      <strong>{row.entry.ticketNumber}</strong>
                    </td>
                    <td>
                      <span className={`source-label source-label--${row.entry.source}`}>
                        {row.entry.source === "remote" ? "원격" : "현장"}
                      </span>
                    </td>
                    <td>{formatPatientCounts(row.entry)}</td>
                    <td>
                      <span className={`waiting-state waiting-state--${row.entry.status}`}>
                        {statusLabels[row.entry.status]}
                      </span>
                    </td>
                    <td>{row.entry.registeredAt}</td>
                    <td>
                      <div className="row-actions">
                        {row.entry.status === "entry_requested" && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onChangeStatus(row.entry.id, "onsite_waiting");
                            }}
                          >
                            <UserCheck size={17} />
                            도착 처리
                          </button>
                        )}
                        {row.entry.status === "onsite_waiting" && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onChangeStatus(row.entry.id, "called");
                            }}
                          >
                            <Megaphone size={17} />
                            진료실 호출
                          </button>
                        )}
                        {row.entry.status === "held" && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRestore(row.entry.id);
                            }}
                          >
                            <RotateCcw size={17} />
                            대기열 복귀
                          </button>
                        )}
                        {row.position !== null && (
                          <>
                            <button
                              type="button"
                              aria-label={`접수번호 ${row.entry.ticketNumber} 한 칸 위로`}
                              disabled={activeQueueRows[0]?.entry.id === row.entry.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveActiveWaiting(row.entry.id, -1);
                              }}
                            >
                              <ArrowUp size={17} />
                            </button>
                            <button
                              type="button"
                              aria-label={`접수번호 ${row.entry.ticketNumber} 한 칸 아래로`}
                              disabled={activeQueueRows.at(-1)?.entry.id === row.entry.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveActiveWaiting(row.entry.id, 1);
                              }}
                            >
                              <ArrowDown size={17} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
      {selected && (
        <aside className="staff-detail">
          <button
            className="detail-close"
            type="button"
            aria-label="상세 닫기"
            onClick={() => setSelectedId(undefined)}
          >
            ×
          </button>
          <p>접수번호</p>
          <h2>{selected.entry.ticketNumber}</h2>
          <dl>
            <div>
              <dt>유형</dt>
              <dd>{selected.entry.source === "remote" ? "원격" : "현장"}</dd>
            </div>
            <div>
              <dt>가족 인원</dt>
              <dd>{formatPatientCounts(selected.entry)}</dd>
            </div>
            <div>
              <dt>현재 상태</dt>
              <dd>{statusLabels[selected.entry.status]}</dd>
            </div>
            <div>
              <dt>대기 팀</dt>
              <dd>{selected.teamNumber ? `${selected.teamNumber}팀` : "대기열 제외"}</dd>
            </div>
            <div>
              <dt>실제 환자 순서</dt>
              <dd>{formatPositionRange(selected)}</dd>
            </div>
          </dl>
          <div className="detail-actions">
            {selected.entry.status === "held" && (
              <label>
                복귀 팀 위치
                <input
                  type="number"
                  min={1}
                  max={activeQueueRows.length + 1}
                  value={restorePosition}
                  onChange={(event) => setRestorePosition(event.target.valueAsNumber)}
                />
                <button
                  type="button"
                  disabled={
                    !Number.isInteger(restorePosition) ||
                    restorePosition < 1 ||
                    restorePosition > activeQueueRows.length + 1
                  }
                  onClick={() => onRestore(selected.entry.id, restorePosition)}
                >
                  <RotateCcw size={18} />
                  지정 위치로 복귀
                </button>
              </label>
            )}
            {selected.entry.status !== "held" && (
              <button type="button" onClick={() => onHold(selected.entry.id)}>
                <PauseCircle size={18} />
                보류
              </button>
            )}
            <button
              className="danger"
              type="button"
              onClick={() => onChangeStatus(selected.entry.id, "cancelled")}
            >
              <CircleX size={18} />
              취소
            </button>
          </div>
        </aside>
      )}
      {showOnsiteForm && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="onsite-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onsite-title"
          >
            <h2 id="onsite-title">현장 환자 등록</h2>
            <p>데스크 접수를 마친 환자의 연락처와 가족 인원을 입력합니다.</p>
            <label className="onsite-phone-field">
              휴대전화 번호
              <input
                type="tel"
                inputMode="numeric"
                maxLength={13}
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(formatKoreanMobileNumber(event.target.value))}
                placeholder="010-1234-5678"
                autoComplete="tel"
              />
            </label>
            {!phoneNumberValid && phoneNumber.length > 0 && (
              <p className="field-error">국내 휴대전화 번호를 입력해 주세요.</p>
            )}
            {patientInputMode === "categorized" ? (
              <div className="onsite-count-list">
                {patientCategories
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((category) => (
                    <PatientCountStepper
                      key={category.id}
                      category={category}
                      count={counts[category.id] ?? 0}
                      total={onsitePatientCount}
                      onChange={(categoryId, nextCount) =>
                        setCounts((current) => ({
                          ...current,
                          [categoryId]: Math.max(0, nextCount),
                        }))
                      }
                    />
                  ))}
              </div>
            ) : (
              <label className="onsite-total-field">
                총인원
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={totalOnlyCount}
                  onChange={(event) => {
                    const nextCount = event.target.valueAsNumber;
                    setTotalOnlyCount(Number.isFinite(nextCount) ? nextCount : 0);
                  }}
                />
              </label>
            )}
            {onsitePatientCount < 1 && (
              <p className="field-error">접수할 환자 인원을 1명 이상 선택해 주세요.</p>
            )}
            <div className="notice notice--info onsite-notification-notice">
              등록하면 접수 완료 알림톡 mock과 상태 확인 링크가 생성됩니다.
            </div>
            {onsiteSubmitError && <p className="field-error">{onsiteSubmitError}</p>}
            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowOnsiteForm(false)}
              >
                닫기
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={submitOnsite}
                disabled={
                  isSubmittingOnsite ||
                  !phoneNumberValid ||
                  !Number.isInteger(onsitePatientCount) ||
                  onsitePatientCount < 1 ||
                  onsitePatientCount > 9
                }
              >
                {isSubmittingOnsite ? "등록 중" : "대기열에 추가"}
              </button>
            </div>
          </section>
        </div>
      )}
      {notificationReceipt && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="notification-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-preview-title"
          >
            <span className="notification-preview-icon">
              <MessageCircleMore size={24} />
            </span>
            <h2 id="notification-preview-title">현장 접수가 등록되었습니다</h2>
            <p>
              {notificationReceipt.recipientPhoneMasked} 번호로 접수 완료 알림톡 mock을
              생성했습니다.
            </p>
            <div className="notification-preview-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setNotificationReceipt(undefined)}
              >
                닫기
              </button>
              <a
                className="primary-button"
                href={notificationReceipt.openPath}
                target="_blank"
                rel="noreferrer"
              >
                Mock 알림톡 보기
              </a>
            </div>
          </section>
        </div>
      )}
      {showCategorySettings && (
        <PatientCategorySettingsModal
          inputMode={nextDayInputMode}
          categories={nextDayCategories}
          onClose={() => setShowCategorySettings(false)}
          onSave={onSavePatientConfiguration}
        />
      )}
    </div>
  );
}

function formatQueueDate(queueDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(queueDate)) return "운영일 불러오는 중";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(`${queueDate}T00:00:00+09:00`));
}
