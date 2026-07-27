import { HttpError } from "../../common/errors/HttpError";
import { findScheduleById } from "../schedules/schedules.repository";
import { findActiveSubstituteRequestByScheduleId, insertSubstituteRequest } from "./substituteRequests.repository";
import {
  CreateSubstituteRequestInput,
  SubstituteRequestRecord,
  SubstituteRequestResponse,
  SubstituteRequestStatus
} from "./substituteRequests.types";

const ACTIVE_SUBSTITUTE_REQUEST_STATUSES: SubstituteRequestStatus[] = ["OPEN", "PENDING_APPROVAL", "APPROVED"];

function toSubstituteRequestResponse(request: SubstituteRequestRecord): SubstituteRequestResponse {
  return {
    id: request.id,
    storeId: request.store_id,
    scheduleId: request.schedule_id,
    requesterId: request.requester_id,
    candidateWorkerId: request.candidate_worker_id,
    status: request.status,
    reason: request.reason,
    rejectReason: request.reject_reason,
    createdAt: request.created_at,
    updatedAt: request.updated_at
  };
}

function getTodayDateText() {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export async function createStoreSubstituteRequest(input: CreateSubstituteRequestInput) {
  const schedule = await findScheduleById(input.scheduleId);

  if (!schedule) {
    throw new HttpError(404, "근무 일정을 찾을 수 없습니다.", "SCHEDULE_NOT_FOUND");
  }

  if (schedule.store_id !== input.storeId) {
    throw new HttpError(400, "선택한 근무 일정이 현재 매장에 속하지 않습니다.", "SCHEDULE_STORE_MISMATCH");
  }

  if (schedule.worker_id !== input.requesterId) {
    throw new HttpError(403, "본인 근무에 대해서만 대타 요청을 등록할 수 있습니다.", "SCHEDULE_OWNER_REQUIRED");
  }

  if (schedule.work_date < getTodayDateText()) {
    throw new HttpError(400, "지난 근무 일정은 대타 요청을 등록할 수 없습니다.", "PAST_SCHEDULE_NOT_ALLOWED");
  }

  const activeRequest = await findActiveSubstituteRequestByScheduleId(
    input.scheduleId,
    ACTIVE_SUBSTITUTE_REQUEST_STATUSES
  );

  if (activeRequest) {
    throw new HttpError(409, "이미 진행 중인 대타 요청이 있는 근무입니다.", "ACTIVE_SUBSTITUTE_REQUEST_EXISTS");
  }

  const substituteRequest = await insertSubstituteRequest(input);

  return {
    substituteRequest: toSubstituteRequestResponse(substituteRequest)
  };
}
