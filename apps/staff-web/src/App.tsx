import type {
  StaffQueueState,
  NotificationReceipt,
  MockHospitalApplicationInput,
  MockHospitalInquiryInput,
  MockHospitalOnboardingState,
  OnsiteWaitingRegistrationInput,
  PatientCategoryDefinition,
  PatientInputMode,
  PatientRegistrationInput,
  QueueStatus,
  QueueSettings,
  WaitingStatus,
} from "@baro-jinryo/shared";
import { defaultPatientCategories, defaultQueueSettings } from "@baro-jinryo/shared";
import { useCallback, useEffect, useState } from "react";
import { StaffQueuePage } from "./pages/StaffQueuePage";
import { StaffLoginPage } from "./pages/StaffLoginPage";
import { StaffAuthProvider, useStaffAuth } from "./auth/StaffAuthContext";
import { HospitalOnboardingPage } from "./pages/HospitalOnboardingPage";
import { HospitalManagementPage } from "./pages/HospitalManagementPage";
import {
  addOnsiteWaiting,
  changeQueueStatus,
  changeWaitingStatus,
  getStaffQueue,
  getWaitingNotificationHistory,
  getHospitalOnboarding,
  holdWaiting,
  restoreWaiting,
  reorderWaitings,
  saveNextDayCategories,
  submitHospitalApplication,
  submitHospitalInquiry,
  updateQueueSettings,
  isApiClientErrorCode,
} from "./services/apiClient";

const pollInterval = Number(import.meta.env.VITE_WAITING_POLL_INTERVAL_MS ?? 10_000);

const initialState: StaffQueueState = {
  entries: [],
  positions: [],
  queueDate: "",
  queueStatus: "paused",
  todayInputMode: "categorized",
  nextDayInputMode: "categorized",
  todayCategories: defaultPatientCategories,
  nextDayCategories: defaultPatientCategories,
  settings: { ...defaultQueueSettings },
};

function StaffApp() {
  const { session, profile, loading, signOut } = useStaffAuth();
  const [queue, setQueue] = useState(initialState);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "retrying">("connected");
  const [view, setView] = useState<"queue" | "onboarding" | "hospital-management">("queue");
  const [onboarding, setOnboarding] = useState<MockHospitalOnboardingState>({
    inquiry: null,
    application: null,
    canOperateQueue: false,
  });

  const refresh = useCallback(async () => {
    if (view === "hospital-management") return;
    if (view === "onboarding") {
      setOnboarding(await getHospitalOnboarding());
      return;
    }

    try {
      const nextQueue = await getStaffQueue();
      setQueue(nextQueue);
    } catch (error) {
      if (!isApiClientErrorCode(error, "HOSPITAL_ACCESS_DENIED")) throw error;
      setOnboarding(await getHospitalOnboarding());
      setView("onboarding");
    }
  }, [view]);

  useEffect(() => {
    if (!session || view === "hospital-management") return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        await refresh();
        setConnectionStatus("connected");
      } catch (error) {
        setConnectionStatus("retrying");
        console.error("Failed to refresh staff data", error);
      } finally {
        if (!cancelled) timer = window.setTimeout(() => void poll(), pollInterval);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [refresh, session, view]);

  const retryConnection = useCallback(async () => {
    setConnectionStatus("retrying");
    try {
      await refresh();
      setConnectionStatus("connected");
    } catch (error) {
      setConnectionStatus("retrying");
      console.error("Failed to retry staff data", error);
    }
  }, [refresh]);

  async function updateStatus(id: string, status: WaitingStatus) {
    setQueue(await changeWaitingStatus(id, status));
  }

  async function updateQueueStatus(status: QueueStatus) {
    setQueue(await changeQueueStatus(status));
  }

  async function saveQueueSettings(settings: QueueSettings) {
    setQueue(await updateQueueSettings(settings));
  }

  async function updatePatientConfiguration(
    inputMode: PatientInputMode,
    categories: PatientCategoryDefinition[],
  ) {
    setQueue(await saveNextDayCategories(inputMode, categories));
  }

  async function addOnsite(
    phoneNumber: string,
    registration: PatientRegistrationInput,
  ): Promise<NotificationReceipt> {
    const input: OnsiteWaitingRegistrationInput = { phoneNumber, registration };
    const result = await addOnsiteWaiting(input);
    setQueue(result.queue);
    return result.notification;
  }

  if (loading) return null;
  if (!session || profile?.accountType !== "hospital_admin") return <StaffLoginPage />;

  if (view === "onboarding") {
    return (
      <HospitalOnboardingPage
        state={onboarding}
        onBack={() => setView("queue")}
        onSubmitInquiry={async (input: MockHospitalInquiryInput) =>
          setOnboarding(await submitHospitalInquiry(input))
        }
        onSubmitApplication={async (input: MockHospitalApplicationInput) =>
          setOnboarding(await submitHospitalApplication(input))
        }
        onRefresh={async () => setOnboarding(await getHospitalOnboarding())}
      />
    );
  }

  if (view === "hospital-management") {
    return <HospitalManagementPage onBack={() => setView("queue")} onSignOut={signOut} />;
  }

  return (
    <StaffQueuePage
      entries={queue.entries}
      queueDate={queue.queueDate}
      patientCategories={queue.todayCategories}
      nextDayCategories={queue.nextDayCategories}
      patientInputMode={queue.todayInputMode}
      nextDayInputMode={queue.nextDayInputMode}
      queueStatus={queue.queueStatus}
      settings={queue.settings}
      onAddOnsite={addOnsite}
      onChangeQueueStatus={updateQueueStatus}
      onSaveQueueSettings={saveQueueSettings}
      onChangeStatus={updateStatus}
      onHold={async (id) => setQueue(await holdWaiting(id))}
      onRestore={async (id, position) => setQueue(await restoreWaiting(id, position))}
      onReorder={async (expectedWaitingIds, orderedWaitingIds) =>
        setQueue(await reorderWaitings(expectedWaitingIds, orderedWaitingIds))
      }
      onSavePatientConfiguration={updatePatientConfiguration}
      onRefresh={() => void retryConnection()}
      onGetNotificationHistory={getWaitingNotificationHistory}
      connectionStatus={connectionStatus}
      onRetry={retryConnection}
      onOpenHospitalManagement={() => setView("hospital-management")}
      onSignOut={signOut}
    />
  );
}

export default function App() {
  return (
    <StaffAuthProvider>
      <StaffApp />
    </StaffAuthProvider>
  );
}
