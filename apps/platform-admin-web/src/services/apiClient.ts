import type { HospitalInquiryStatus, MockHospitalInquiry } from "@baro-jinryo/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  return (await response.json()) as T;
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
