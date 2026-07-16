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
  WaitingStatus,
} from "@baro-jinryo/shared";
import { defaultPatientCategories } from "@baro-jinryo/shared";
import { useCallback, useEffect, useState } from "react";
import { StaffQueuePage } from "./pages/StaffQueuePage";
import { StaffLoginPage } from "./pages/StaffLoginPage";
import { StaffAuthProvider, useStaffAuth } from "./auth/StaffAuthContext";
import { HospitalOnboardingPage } from "./pages/HospitalOnboardingPage";
import {
  addOnsiteWaiting,
  changeQueueStatus,
  changeWaitingStatus,
  getStaffQueue,
  getHospitalOnboarding,
  holdWaiting,
  restoreWaiting,
  reorderWaitings,
  saveNextDayCategories,
  submitHospitalApplication,
  submitHospitalInquiry,
} from "./services/apiClient";

const pollInterval = Number(import.meta.env.VITE_WAITING_POLL_INTERVAL_MS ?? 10_000);

const initialState: StaffQueueState = {
  entries: [],
  positions: [],
  queueDate: "",
  queueStatus: "open",
  todayInputMode: "categorized",
  nextDayInputMode: "categorized",
  todayCategories: defaultPatientCategories,
  nextDayCategories: defaultPatientCategories,
};

function StaffApp() {
  const { session, profile, loading, signOut } = useStaffAuth();
  const [queue, setQueue] = useState(initialState);
  const [view, setView] = useState<"queue" | "onboarding">("queue");
  const [onboarding, setOnboarding] = useState<MockHospitalOnboardingState>({
    inquiry: null,
    application: null,
    canOperateQueue: false,
  });

  const refresh = useCallback(async () => {
    const [nextQueue, nextOnboarding] = await Promise.all([
      getStaffQueue(),
      getHospitalOnboarding(),
    ]);
    setQueue(nextQueue);
    setOnboarding(nextOnboarding);
  }, []);

  useEffect(() => {
    if (!session) return;
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), pollInterval);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refresh, session]);

  async function updateStatus(id: string, status: WaitingStatus) {
    setQueue(await changeWaitingStatus(id, status));
  }

  async function updateQueueStatus(status: QueueStatus) {
    setQueue(await changeQueueStatus(status));
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
    setQueue(await getStaffQueue());
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

  return (
    <StaffQueuePage
      entries={queue.entries}
      queueDate={queue.queueDate}
      patientCategories={queue.todayCategories}
      nextDayCategories={queue.nextDayCategories}
      patientInputMode={queue.todayInputMode}
      nextDayInputMode={queue.nextDayInputMode}
      queueStatus={queue.queueStatus}
      onAddOnsite={addOnsite}
      onChangeQueueStatus={updateQueueStatus}
      onChangeStatus={updateStatus}
      onHold={async (id) => setQueue(await holdWaiting(id))}
      onRestore={async (id, position) => setQueue(await restoreWaiting(id, position))}
      onReorder={async (orderedWaitingIds) => setQueue(await reorderWaitings(orderedWaitingIds))}
      onSavePatientConfiguration={updatePatientConfiguration}
      onRefresh={refresh}
      onOpenOnboarding={() => setView("onboarding")}
      onSignOut={signOut}
    />
  );
}

export default function App() {
  return <StaffAuthProvider><StaffApp /></StaffAuthProvider>;
}
