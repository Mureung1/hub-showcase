import type {
  HospitalInquiryStatus,
  MockHospitalApplication,
  MockHospitalApplicationInput,
  MockHospitalInquiry,
  MockHospitalInquiryInput,
  MockHospitalOnboardingState,
} from "@baro-jinryo/shared";

let inquiry: MockHospitalInquiry | null = null;
let application: MockHospitalApplication | null = null;

function now(): string {
  return new Date().toISOString();
}

export function resetMockOnboardingStore(): void {
  inquiry = null;
  application = null;
}

export function getMockHospitalOnboardingState(): MockHospitalOnboardingState {
  return {
    inquiry,
    application,
    canOperateQueue: application?.status === "approved",
  };
}

export function submitMockHospitalInquiry(
  input: MockHospitalInquiryInput,
): MockHospitalOnboardingState {
  if (inquiry?.status === "submitted") return getMockHospitalOnboardingState();
  inquiry = {
    id: `inquiry-${Date.now()}`,
    ...input,
    status: "submitted",
    submittedAt: now(),
  };
  application = null;
  return getMockHospitalOnboardingState();
}

export function listMockHospitalInquiries(): MockHospitalInquiry[] {
  return inquiry ? [inquiry] : [];
}

export function reviewMockHospitalInquiry(
  id: string,
  status: Extract<HospitalInquiryStatus, "accepted" | "rejected">,
): MockHospitalInquiry | null {
  if (!inquiry || inquiry.id !== id || inquiry.status !== "submitted") return null;
  inquiry = { ...inquiry, status, reviewedAt: now() };
  return inquiry;
}

export function submitMockHospitalApplication(
  input: MockHospitalApplicationInput,
): MockHospitalOnboardingState | null {
  if (inquiry?.status !== "accepted") return null;
  application = {
    id: `application-${Date.now()}`,
    ...input,
    status: "approved",
    verificationProvider: "mock",
    submittedAt: now(),
  };
  return getMockHospitalOnboardingState();
}
