import type {
  MockStaffQueueState,
  MockOnsiteRegistrationResult,
  MockHospitalApplicationInput,
  MockHospitalInquiryInput,
  MockHospitalOnboardingState,
  OnsiteWaitingRegistrationInput,
  PatientCategoryDefinition,
  PatientInputMode,
  QueueStatus,
  WaitingStatus,
} from "@baro-jinryo/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function requestJson<T = MockStaffQueueState>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  return (await response.json()) as T;
}

export function getStaffQueue(): Promise<MockStaffQueueState> {
  return requestJson("/mock/staff/queue");
}

export function addOnsiteWaiting(
  input: OnsiteWaitingRegistrationInput,
): Promise<MockOnsiteRegistrationResult> {
  return requestJson<MockOnsiteRegistrationResult>("/mock/staff/waitings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeWaitingStatus(
  id: string,
  status: WaitingStatus,
): Promise<MockStaffQueueState> {
  return requestJson(`/mock/staff/waitings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function holdWaiting(id: string): Promise<MockStaffQueueState> {
  return requestJson(`/mock/staff/waitings/${id}/hold`, { method: "POST" });
}

export function restoreWaiting(id: string): Promise<MockStaffQueueState> {
  return requestJson(`/mock/staff/waitings/${id}/restore`, { method: "POST" });
}

export function changeQueueStatus(status: QueueStatus): Promise<MockStaffQueueState> {
  return requestJson("/mock/staff/queue/status", {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function saveNextDayCategories(
  inputMode: PatientInputMode,
  categories: PatientCategoryDefinition[],
): Promise<MockStaffQueueState> {
  return requestJson("/mock/staff/categories/next-day", {
    method: "PUT",
    body: JSON.stringify({ inputMode, categories }),
  });
}

export function getHospitalOnboarding(): Promise<MockHospitalOnboardingState> {
  return requestJson<MockHospitalOnboardingState>("/mock/hospital-onboarding");
}

export function submitHospitalInquiry(
  input: MockHospitalInquiryInput,
): Promise<MockHospitalOnboardingState> {
  return requestJson<MockHospitalOnboardingState>("/mock/hospital-inquiries", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function submitHospitalApplication(
  input: MockHospitalApplicationInput,
): Promise<MockHospitalOnboardingState> {
  return requestJson<MockHospitalOnboardingState>("/mock/hospital-applications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
