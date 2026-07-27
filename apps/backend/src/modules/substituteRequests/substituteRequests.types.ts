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

export type SubstituteRequestScheduleRecord = {
  id: string;
  worker_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  position: string | null;
  memo: string | null;
};

export type SubstituteRequestProfileRecord = {
  id: string;
  name: string;
};

export type SubstituteRequestListItemResponse = SubstituteRequestResponse & {
  requesterName: string;
  workerId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  position: string | null;
  memo: string | null;
};

export type SubstituteRequestsResponse = {
  substituteRequests: SubstituteRequestListItemResponse[];
};

export type CreateSubstituteRequestInput = {
  storeId: string;
  scheduleId: string;
  requesterId: string;
  reason: string;
};

export type ListSubstituteRequestsInput = {
  storeId: string;
  actorUserId: string;
  actorRole: "OWNER" | "WORKER";
};

export type ApplySubstituteRequestInput = {
  requestId: string;
  actorUserId: string;
};

export type SubstituteApplicationRecord = {
  id: string;
  request_id: string;
  worker_id: string;
  created_at: string;
};

export type CreateSubstituteRequestResponse = {
  substituteRequest: SubstituteRequestResponse;
};
