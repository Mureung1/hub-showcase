export type SubstituteRequestStatus = "OPEN" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CLOSED";

export type SubstituteRequestRecord = {
  id: string;
  store_id: string;
  schedule_id: string;
  requester_id: string;
  candidate_worker_id: string | null;
  status: SubstituteRequestStatus;
  reason: string;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type SubstituteRequestResponse = {
  id: string;
  storeId: string;
  scheduleId: string;
  requesterId: string;
  candidateWorkerId: string | null;
  status: SubstituteRequestStatus;
  reason: string;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSubstituteRequestInput = {
  storeId: string;
  scheduleId: string;
  requesterId: string;
  reason: string;
};

export type CreateSubstituteRequestResponse = {
  substituteRequest: SubstituteRequestResponse;
};
