import type {
  StaffQueueState,
  StaffNotificationHistoryItem,
  OnsiteRegistrationResult,
  MockHospitalApplicationInput,
  MockHospitalInquiryInput,
  MockHospitalOnboardingState,
  OnsiteWaitingRegistrationInput,
  PatientCategoryDefinition,
  PatientInputMode,
  QueueStatus,
  QueueSettings,
  WaitingStatus,
  HospitalInformation,
  HospitalManagementState,
  HospitalChangeRequestView,
} from "@baro-jinryo/shared";
import { createJsonRequester } from "@baro-jinryo/web-shared";
import { getSupabaseClient } from "./supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export interface StaffProfile {
  id: string;
  phoneNumber: string;
  accountType: "patient" | "hospital_admin" | "platform_admin";
  status: "active" | "suspended" | "withdrawn";
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export function isApiClientErrorCode(error: unknown, code: string): boolean {
  return error instanceof ApiClientError && error.code === code;
}

async function getAccessToken(): Promise<string | undefined> {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    return undefined;
  }
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session?.access_token;
}

const requestJson = createJsonRequester({
  baseUrl: apiBaseUrl,
  getAccessToken,
  createError: ({ status, body }) => {
    const errorBody = body as ApiErrorBody | null;
    return new ApiClientError(
      status,
      errorBody?.error?.code ?? "API_REQUEST_FAILED",
      errorBody?.error?.message ?? `API 요청 실패: ${status}`,
    );
  },
});

export function getStaffQueue(): Promise<StaffQueueState> {
  return requestJson("/staff/queue");
}

export function getWaitingNotificationHistory(
  waitingId: string,
): Promise<StaffNotificationHistoryItem[]> {
  return requestJson<StaffNotificationHistoryItem[]>(`/staff/waitings/${waitingId}/notifications`);
}

export function getHospitalManagement(): Promise<HospitalManagementState> {
  return requestJson<HospitalManagementState>("/staff/hospital");
}

export function submitHospitalChangeRequest(
  input: HospitalInformation,
): Promise<HospitalChangeRequestView> {
  return requestJson<HospitalChangeRequestView>("/staff/hospital-change-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCurrentStaffProfile(accessToken: string): Promise<StaffProfile | null> {
  const result = await requestJson<{ profile: StaffProfile | null }>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.profile;
}

export async function createStaffProfile(phoneNumber: string, accessToken: string): Promise<void> {
  await requestJson("/profiles", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ phoneNumber, accountType: "hospital_admin" }),
  });
}

export function addOnsiteWaiting(
  input: OnsiteWaitingRegistrationInput,
): Promise<OnsiteRegistrationResult> {
  return requestJson<OnsiteRegistrationResult>("/staff/waitings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeWaitingStatus(id: string, status: WaitingStatus): Promise<StaffQueueState> {
  return requestJson(`/staff/waitings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      ...(status === "cancelled" ? { reason: "병원 직원 확인 후 취소" } : {}),
    }),
  });
}

export function holdWaiting(id: string): Promise<StaffQueueState> {
  return requestJson(`/staff/waitings/${id}/hold`, { method: "POST" });
}

export function restoreWaiting(id: string, position?: number): Promise<StaffQueueState> {
  return requestJson(`/staff/waitings/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({ position }),
  });
}

export function reorderWaitings(
  expectedWaitingIds: string[],
  orderedWaitingIds: string[],
): Promise<StaffQueueState> {
  return requestJson("/staff/waitings/order", {
    method: "PUT",
    body: JSON.stringify({ expectedWaitingIds, orderedWaitingIds }),
  });
}

export function changeQueueStatus(status: QueueStatus): Promise<StaffQueueState> {
  return requestJson("/staff/queue/status", {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateQueueSettings(settings: QueueSettings): Promise<StaffQueueState> {
  return requestJson("/staff/queue/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}

export function saveNextDayCategories(
  inputMode: PatientInputMode,
  categories: PatientCategoryDefinition[],
): Promise<StaffQueueState> {
  return requestJson("/staff/categories/next-day", {
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
