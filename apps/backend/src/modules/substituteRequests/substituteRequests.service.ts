import { HttpError } from "../../common/errors/HttpError";
import { findStoreMembership } from "../../common/repositories/storeMembership.repository";
import { createNotifications } from "../notifications/notifications.service";
import {
  findOverlappingWorkerSchedules,
  findScheduleById,
  transferScheduleToSubstitute
} from "../schedules/schedules.repository";
import { findStoreById } from "../stores/stores.repository";
import {
  approveSubstituteRequestById,
  findActiveSubstituteRequestByScheduleId,
  findSubstituteApplication,
  findSubstituteRequestById,
  findSubstituteRequestsByStoreIdAndStatuses,
  findSubstituteRequestProfiles,
  findSubstituteRequestSchedules,
  insertSubstituteApplication,
  insertSubstituteRequest,
  rejectSubstituteRequestById,
  updateSubstituteRequestCandidate
} from "./substituteRequests.repository";
import {
  ApplySubstituteRequestInput,
  ApproveSubstituteRequestInput,
  CreateSubstituteRequestInput,
  ListSubstituteRequestsInput,
  RejectSubstituteRequestInput,
  SubstituteRequestRecord,
  SubstituteRequestScheduleRecord,
  SubstituteRequestListItemResponse,
  SubstituteRequestResponse,
  SubstituteRequestStatus
} from "./substituteRequests.types";

const ACTIVE_SUBSTITUTE_REQUEST_STATUSES: SubstituteRequestStatus[] = ["OPEN", "PENDING_APPROVAL", "APPROVED"];

function getScheduleTimeLabel(schedule: { work_date: string; start_time: string; end_time: string }) {
  return `${schedule.work_date} ${schedule.start_time.slice(0, 5)}-${schedule.end_time.slice(0, 5)}`;
}

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

function toSubstituteRequestListItemResponse(input: {
  request: SubstituteRequestRecord;
  requesterName: string;
  candidateWorkerName: string | null;
  schedule: SubstituteRequestScheduleRecord;
}): SubstituteRequestListItemResponse {
  return {
    ...toSubstituteRequestResponse(input.request),
    requesterName: input.requesterName,
    candidateWorkerName: input.candidateWorkerName,
    workerId: input.schedule.worker_id,
    workDate: input.schedule.work_date,
    startTime: input.schedule.start_time,
    endTime: input.schedule.end_time,
    position: input.schedule.position,
    memo: input.schedule.memo
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

export async function listStoreSubstituteRequests(input: ListSubstituteRequestsInput) {
  const visibleStatuses: SubstituteRequestStatus[] =
    input.actorRole === "OWNER" ? ["OPEN", "PENDING_APPROVAL"] : ["OPEN"];
  const requests = await findSubstituteRequestsByStoreIdAndStatuses(input.storeId, visibleStatuses);
  const scheduleIds = [...new Set(requests.map((request) => request.schedule_id))];
  const profileIds = [
    ...new Set(
      requests.flatMap((request) =>
        request.candidate_worker_id ? [request.requester_id, request.candidate_worker_id] : [request.requester_id]
      )
    )
  ];
  const schedules = await findSubstituteRequestSchedules(scheduleIds);
  const profiles = await findSubstituteRequestProfiles(profileIds);
  const scheduleMap = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const todayDate = getTodayDateText();
  const substituteRequests = requests
    .map((request) => {
      const schedule = scheduleMap.get(request.schedule_id);

      if (!schedule || schedule.work_date < todayDate) {
        return null;
      }

      if (input.actorRole === "WORKER" && request.requester_id === input.actorUserId) {
        return null;
      }

      return toSubstituteRequestListItemResponse({
        request,
        requesterName: profileMap.get(request.requester_id)?.name ?? "알바생",
        candidateWorkerName: request.candidate_worker_id
          ? profileMap.get(request.candidate_worker_id)?.name ?? "알바생"
          : null,
        schedule
      });
    })
    .filter((request): request is SubstituteRequestListItemResponse => request !== null)
    .sort((first, second) => {
      const dateCompare = first.workDate.localeCompare(second.workDate);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return first.startTime.localeCompare(second.startTime);
    });

  return {
    substituteRequests
  };
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
  const store = await findStoreById(input.storeId);

  if (store) {
    await createNotifications([
      {
        userId: store.owner_id,
        type: "SUBSTITUTE_REQUEST_CREATED",
        title: "대타 요청이 등록되었습니다.",
        message: `${getScheduleTimeLabel(schedule)} 근무에 대타 요청이 등록되었습니다.`
      }
    ]);
  }

  return {
    substituteRequest: toSubstituteRequestResponse(substituteRequest)
  };
}

export async function applyToSubstituteRequest(input: ApplySubstituteRequestInput) {
  const request = await findSubstituteRequestById(input.requestId);

  if (!request) {
    throw new HttpError(404, "대타 요청을 찾을 수 없습니다.", "SUBSTITUTE_REQUEST_NOT_FOUND");
  }

  if (request.status !== "OPEN") {
    throw new HttpError(409, "이미 다른 알바생이 신청한 요청입니다.", "SUBSTITUTE_REQUEST_NOT_OPEN");
  }

  if (request.requester_id === input.actorUserId) {
    throw new HttpError(403, "본인이 등록한 대타 요청에는 신청할 수 없습니다.", "CANNOT_APPLY_OWN_REQUEST");
  }

  const membership = await findStoreMembership(request.store_id, input.actorUserId);

  if (!membership || membership.role !== "WORKER") {
    throw new HttpError(403, "같은 매장 알바생만 대타 요청에 신청할 수 있습니다.", "WORKER_ROLE_REQUIRED");
  }

  const schedule = await findScheduleById(request.schedule_id);

  if (!schedule) {
    throw new HttpError(404, "근무 일정을 찾을 수 없습니다.", "SCHEDULE_NOT_FOUND");
  }

  if (schedule.store_id !== request.store_id) {
    throw new HttpError(400, "대타 요청과 근무 일정의 매장이 일치하지 않습니다.", "SCHEDULE_STORE_MISMATCH");
  }

  if (schedule.work_date < getTodayDateText()) {
    throw new HttpError(400, "지난 근무의 대타 요청에는 신청할 수 없습니다.", "PAST_SCHEDULE_NOT_ALLOWED");
  }

  const existingApplication = await findSubstituteApplication(input.requestId, input.actorUserId);

  if (existingApplication) {
    throw new HttpError(409, "이미 신청한 대타 요청입니다.", "SUBSTITUTE_APPLICATION_EXISTS");
  }

  const overlappingSchedules = await findOverlappingWorkerSchedules({
    storeId: request.store_id,
    workerId: input.actorUserId,
    workDate: schedule.work_date,
    startTime: schedule.start_time,
    endTime: schedule.end_time
  });

  if (overlappingSchedules.length > 0) {
    throw new HttpError(409, "같은 시간에 이미 등록된 근무가 있어 신청할 수 없습니다.", "SCHEDULE_TIME_OVERLAP");
  }

  const updatedRequest = await updateSubstituteRequestCandidate(input);

  if (!updatedRequest) {
    throw new HttpError(409, "이미 다른 알바생이 신청한 요청입니다.", "SUBSTITUTE_REQUEST_NOT_OPEN");
  }

  await insertSubstituteApplication(input);
  const store = await findStoreById(request.store_id);
  const notifications = [
    {
      userId: request.requester_id,
      type: "SUBSTITUTE_REQUEST_APPLIED" as const,
      title: "대타 신청이 들어왔습니다.",
      message: `${getScheduleTimeLabel(schedule)} 근무에 대타 신청이 들어왔습니다.`
    }
  ];

  if (store) {
    notifications.push({
      userId: store.owner_id,
      type: "SUBSTITUTE_REQUEST_APPLIED",
      title: "대타 신청이 들어왔습니다.",
      message: `${getScheduleTimeLabel(schedule)} 근무에 대타 신청이 들어왔습니다.`
    });
  }

  await createNotifications(notifications);

  return {
    substituteRequest: toSubstituteRequestResponse(updatedRequest)
  };
}

async function findReviewableRequest(input: ApproveSubstituteRequestInput | RejectSubstituteRequestInput) {
  const request = await findSubstituteRequestById(input.requestId);

  if (!request) {
    throw new HttpError(404, "대타 요청을 찾을 수 없습니다.", "SUBSTITUTE_REQUEST_NOT_FOUND");
  }

  const membership = await findStoreMembership(request.store_id, input.actorUserId);

  if (!membership || membership.role !== "OWNER") {
    throw new HttpError(403, "사장님만 대타 요청을 승인하거나 거절할 수 있습니다.", "OWNER_ROLE_REQUIRED");
  }

  if (request.status !== "PENDING_APPROVAL") {
    throw new HttpError(409, "승인 대기 상태의 대타 요청만 처리할 수 있습니다.", "SUBSTITUTE_REQUEST_NOT_PENDING");
  }

  if (!request.candidate_worker_id) {
    throw new HttpError(409, "신청 후보자가 없는 대타 요청입니다.", "SUBSTITUTE_CANDIDATE_REQUIRED");
  }

  return request;
}

export async function approveSubstituteRequest(input: ApproveSubstituteRequestInput) {
  const request = await findReviewableRequest(input);
  const candidateMembership = await findStoreMembership(request.store_id, request.candidate_worker_id ?? "");

  if (!candidateMembership || candidateMembership.role !== "WORKER") {
    throw new HttpError(409, "후보자가 더 이상 매장 알바생이 아닙니다.", "CANDIDATE_WORKER_REQUIRED");
  }

  const schedule = await findScheduleById(request.schedule_id);

  if (!schedule) {
    throw new HttpError(404, "근무 일정을 찾을 수 없습니다.", "SCHEDULE_NOT_FOUND");
  }

  if (schedule.worker_id !== request.requester_id) {
    throw new HttpError(409, "근무표가 이미 변경되어 승인할 수 없습니다.", "SCHEDULE_ALREADY_CHANGED");
  }

  if (schedule.work_date < getTodayDateText()) {
    throw new HttpError(400, "지난 근무의 대타 요청은 승인할 수 없습니다.", "PAST_SCHEDULE_NOT_ALLOWED");
  }

  const overlappingSchedules = await findOverlappingWorkerSchedules({
    storeId: request.store_id,
    workerId: request.candidate_worker_id ?? "",
    workDate: schedule.work_date,
    startTime: schedule.start_time,
    endTime: schedule.end_time,
    excludeScheduleId: schedule.id
  });

  if (overlappingSchedules.length > 0) {
    throw new HttpError(409, "후보자에게 같은 시간대 근무가 있어 승인할 수 없습니다.", "SCHEDULE_TIME_OVERLAP");
  }

  const transferredSchedule = await transferScheduleToSubstitute({
    scheduleId: schedule.id,
    currentWorkerId: request.requester_id,
    nextWorkerId: request.candidate_worker_id ?? ""
  });

  if (!transferredSchedule) {
    throw new HttpError(409, "근무표가 이미 변경되어 승인할 수 없습니다.", "SCHEDULE_ALREADY_CHANGED");
  }

  const approvedRequest = await approveSubstituteRequestById(input);

  if (!approvedRequest) {
    throw new HttpError(409, "이미 처리된 대타 요청입니다.", "SUBSTITUTE_REQUEST_NOT_PENDING");
  }

  await createNotifications([
    {
      userId: request.requester_id,
      type: "SUBSTITUTE_REQUEST_APPROVED",
      title: "대타 요청이 승인되었습니다.",
      message: `${getScheduleTimeLabel(schedule)} 근무의 대타 요청이 승인되었습니다.`
    },
    {
      userId: request.candidate_worker_id ?? "",
      type: "SUBSTITUTE_REQUEST_APPROVED",
      title: "대타 근무가 확정되었습니다.",
      message: `${getScheduleTimeLabel(schedule)} 근무의 대타로 확정되었습니다.`
    }
  ]);

  return {
    substituteRequest: toSubstituteRequestResponse(approvedRequest)
  };
}

export async function rejectSubstituteRequest(input: RejectSubstituteRequestInput) {
  const request = await findReviewableRequest(input);
  const schedule = await findScheduleById(request.schedule_id);

  const rejectedRequest = await rejectSubstituteRequestById(input);

  if (!rejectedRequest) {
    throw new HttpError(409, "이미 처리된 대타 요청입니다.", "SUBSTITUTE_REQUEST_NOT_PENDING");
  }

  const scheduleLabel = schedule ? getScheduleTimeLabel(schedule) : "요청한";

  await createNotifications([
    {
      userId: request.requester_id,
      type: "SUBSTITUTE_REQUEST_REJECTED",
      title: "대타 요청이 거절되었습니다.",
      message: `${scheduleLabel} 근무의 대타 요청이 거절되었습니다.`
    },
    {
      userId: request.candidate_worker_id ?? "",
      type: "SUBSTITUTE_REQUEST_REJECTED",
      title: "대타 신청이 거절되었습니다.",
      message: `${scheduleLabel} 근무의 대타 신청이 거절되었습니다.`
    }
  ]);

  return {
    substituteRequest: toSubstituteRequestResponse(rejectedRequest)
  };
}
