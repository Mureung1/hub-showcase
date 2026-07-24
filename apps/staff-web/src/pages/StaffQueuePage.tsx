import type {
  NotificationReceipt,
  PatientCategoryDefinition,
  PatientInputMode,
  PatientRegistrationInput,
  QueueEntry,
  QueueStatus,
  QueueSettings,
  StaffNotificationHistoryItem,
  WaitingStatus,
} from "@baro-jinryo/shared";
import { calculateQueuePositions } from "@baro-jinryo/shared";
import {
  Building2,
  CircleX,
  Clock3,
  LogOut,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Settings2,
  Stethoscope,
  UserCheck,
  UsersRound,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";
import { NotificationReceiptModal } from "../components/NotificationReceiptModal";
import { OnsiteRegistrationModal } from "../components/OnsiteRegistrationModal";
import { PatientCategorySettingsModal } from "../components/PatientCategorySettingsModal";
import { QueueSettingsModal } from "../components/QueueSettingsModal";
import { StaffQueueTable } from "../components/StaffQueueTable";
import { WaitingDetailPanel } from "../components/WaitingDetailPanel";

interface StaffQueuePageProps {
  entries: QueueEntry[];
  queueDate: string;
  patientCategories: PatientCategoryDefinition[];
  nextDayCategories: PatientCategoryDefinition[];
  patientInputMode: PatientInputMode;
  nextDayInputMode: PatientInputMode;
  queueStatus: QueueStatus;
  settings: QueueSettings;
  onAddOnsite: (
    phoneNumber: string,
    registration: PatientRegistrationInput,
  ) => Promise<NotificationReceipt>;
  onChangeQueueStatus: (status: QueueStatus) => Promise<void>;
  onSaveQueueSettings: (settings: QueueSettings) => Promise<void>;
  onChangeStatus: (id: string, status: WaitingStatus) => Promise<void>;
  onHold: (id: string) => Promise<void>;
  onRestore: (id: string, position?: number) => Promise<void>;
  onReorder: (orderedWaitingIds: string[]) => Promise<void>;
  onSavePatientConfiguration: (
    inputMode: PatientInputMode,
    categories: PatientCategoryDefinition[],
  ) => void;
  onRefresh: () => void;
  onGetNotificationHistory: (waitingId: string) => Promise<StaffNotificationHistoryItem[]>;
  connectionStatus: "connected" | "retrying";
  onRetry: () => Promise<void>;
  onOpenHospitalManagement: () => void;
  onSignOut: () => Promise<void>;
}

export function StaffQueuePage({
  entries,
  queueDate,
  patientCategories,
  nextDayCategories,
  patientInputMode,
  nextDayInputMode,
  queueStatus,
  settings,
  onAddOnsite,
  onChangeQueueStatus,
  onSaveQueueSettings,
  onChangeStatus,
  onHold,
  onRestore,
  onReorder,
  onSavePatientConfiguration,
  onRefresh,
  onGetNotificationHistory,
  connectionStatus,
  onRetry,
  onOpenHospitalManagement,
  onSignOut,
}: StaffQueuePageProps) {
  const [showOnsiteForm, setShowOnsiteForm] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [showQueueSettings, setShowQueueSettings] = useState(false);
  const [notificationReceipt, setNotificationReceipt] = useState<NotificationReceipt>();
  const [queueStatusError, setQueueStatusError] = useState("");
  const [queueActionError, setQueueActionError] = useState("");
  const [isChangingQueueStatus, setIsChangingQueueStatus] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [isRetryingConnection, setIsRetryingConnection] = useState(false);
  const rows = useMemo(
    () => calculateQueuePositions(entries, settings.averageMinutesPerPatient),
    [entries, settings.averageMinutesPerPatient],
  );
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
    void runQueueAction(() => onReorder(nextIds));
  }

  async function runQueueAction(action: () => Promise<void>) {
    setQueueActionError("");
    try {
      await action();
    } catch (error) {
      setQueueActionError(
        error instanceof Error
          ? error.message
          : "대기열 작업을 처리하지 못했습니다. 새로고침 후 다시 시도해 주세요.",
      );
    }
  }

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

  async function retryConnection() {
    setIsRetryingConnection(true);
    try {
      await onRetry();
    } finally {
      setIsRetryingConnection(false);
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
          <button type="button" onClick={() => setShowCategorySettings(true)}>
            <Settings2 size={20} />
            환자 분류 설정
          </button>
          <button type="button" onClick={() => setShowQueueSettings(true)}>
            <Clock3 size={20} />
            운영 설정
          </button>
          <button type="button" onClick={onOpenHospitalManagement}>
            <Building2 size={20} />
            병원 관리
          </button>
        </nav>
        <a href="http://127.0.0.1:5173">환자 화면 보기</a>
      </aside>
      <main className="staff-main" id="queue">
        {connectionStatus === "retrying" && (
          <div className="connection-alert" role="alert">
            <div>
              <strong>서버 연결이 끊겼습니다.</strong>
              <span>현재 대기열을 유지하고 자동으로 다시 시도하고 있습니다.</span>
            </div>
            <button
              type="button"
              disabled={isRetryingConnection}
              onClick={() => void retryConnection()}
            >
              <RefreshCw size={16} className={isRetryingConnection ? "is-spinning" : undefined} />
              {isRetryingConnection ? "재시도 중" : "지금 다시 시도"}
            </button>
          </div>
        )}
        <div className="staff-title-row">
          <div>
            <h1>통합 대기열</h1>
            <p>
              {formatQueueDate(queueDate)}{" "}
              <span className={`queue-operation queue-operation--${queueStatus}`}>
                <Wifi size={14} />
                {queueStatus === "open" ? "원격 웨이팅 운영 중" : "원격 웨이팅 종료"}
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
        {queueActionError && (
          <div className="notice notice--error" role="alert">
            <CircleX size={20} />
            <div>
              <strong>대기열 작업을 처리하지 못했습니다</strong>
              <p>{queueActionError}</p>
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
            <strong>{settings.averageMinutesPerPatient}분</strong>
          </div>
        </section>
        {queueStatus === "paused" && (
          <div className="notice notice--warning">
            <PauseCircle size={20} />
            <div>
              <strong>원격 웨이팅이 종료되었습니다</strong>
              <p>현장 접수와 기존 대기열 처리는 계속할 수 있습니다.</p>
            </div>
          </div>
        )}
        <StaffQueueTable
          rows={visibleRows}
          activeRows={activeQueueRows}
          selectedId={selectedId}
          onOpen={setSelectedId}
          onChangeStatus={(id, status) => {
            void runQueueAction(() => onChangeStatus(id, status));
          }}
          onRestore={(id) => {
            void runQueueAction(() => onRestore(id));
          }}
          onMove={moveActiveWaiting}
        />
      </main>
      {selected && (
        <WaitingDetailPanel
          key={selected.entry.id}
          waiting={selected}
          activeQueueCount={activeQueueRows.length}
          onClose={() => setSelectedId(undefined)}
          onChangeStatus={(id, status) => {
            void runQueueAction(() => onChangeStatus(id, status));
          }}
          onHold={(id) => {
            void runQueueAction(() => onHold(id));
          }}
          onRestore={(id, position) => {
            void runQueueAction(() => onRestore(id, position));
          }}
          onGetNotificationHistory={onGetNotificationHistory}
        />
      )}
      {showOnsiteForm && (
        <OnsiteRegistrationModal
          inputMode={patientInputMode}
          categories={patientCategories}
          onClose={() => setShowOnsiteForm(false)}
          onSubmit={onAddOnsite}
          onRegistered={(receipt) => {
            setNotificationReceipt(receipt);
            setShowOnsiteForm(false);
          }}
        />
      )}
      {notificationReceipt && (
        <NotificationReceiptModal
          receipt={notificationReceipt}
          onClose={() => setNotificationReceipt(undefined)}
        />
      )}
      {showCategorySettings && (
        <PatientCategorySettingsModal
          inputMode={nextDayInputMode}
          categories={nextDayCategories}
          onClose={() => setShowCategorySettings(false)}
          onSave={onSavePatientConfiguration}
        />
      )}
      {showQueueSettings && (
        <QueueSettingsModal
          settings={settings}
          onClose={() => setShowQueueSettings(false)}
          onSave={onSaveQueueSettings}
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
