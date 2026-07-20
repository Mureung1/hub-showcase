import type {
  HospitalChangeRequestStatus,
  HospitalChangeRequestView,
  HospitalInquiryStatus,
  MockHospitalInquiry,
} from "@baro-jinryo/shared";
import { getSupabaseClient } from "./supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await getSupabaseClient().auth.getSession();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  return (await response.json()) as T;
}

export interface PlatformProfile {
  id: string;
  accountType: "patient" | "hospital_admin" | "platform_admin";
  status: "active" | "suspended" | "withdrawn";
}

export async function getCurrentPlatformProfile(accessToken: string) {
  const result = await requestJson<{ profile: PlatformProfile | null }>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.profile;
}

export function getHospitalChangeRequests(): Promise<HospitalChangeRequestView[]> {
  return requestJson("/platform/hospital-change-requests");
}

export function reviewHospitalChangeRequest(
  id: string,
  status: Extract<HospitalChangeRequestStatus, "approved" | "rejected">,
): Promise<HospitalChangeRequestView> {
  return requestJson(`/platform/hospital-change-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getHospitalInquiries(): Promise<MockHospitalInquiry[]> {
  return requestJson("/mock/platform/hospital-inquiries");
}

export function reviewHospitalInquiry(
  id: string,
  status: Extract<HospitalInquiryStatus, "accepted" | "rejected">,
): Promise<MockHospitalInquiry> {
  return requestJson(`/mock/platform/hospital-inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
