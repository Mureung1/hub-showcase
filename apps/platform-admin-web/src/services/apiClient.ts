import type {
  HospitalChangeRequestStatus,
  HospitalChangeRequestView,
  HospitalInquiryStatus,
  MockHospitalInquiry,
} from "@baro-jinryo/shared";
import { createJsonRequester } from "@baro-jinryo/web-shared";
import { getSupabaseClient } from "./supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

const requestJson = createJsonRequester({
  baseUrl: apiBaseUrl,
  getAccessToken: async () => {
    const { data } = await getSupabaseClient().auth.getSession();
    return data.session?.access_token;
  },
});

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
