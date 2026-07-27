export type SubstituteRequestStatus = "OPEN" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CLOSED";

export type SubstituteRequest = {
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

export type SubstituteRequestListItem = SubstituteRequest & {
  requesterName: string;
  workerId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  position: string | null;
  memo: string | null;
};

export type SubstituteRequestsResponse = {
  substituteRequests: SubstituteRequestListItem[];
};

export type CreateSubstituteRequestInput = {
  scheduleId: string;
  reason: string;
};

export type CreateSubstituteRequestResponse = {
  substituteRequest: SubstituteRequest;
};
