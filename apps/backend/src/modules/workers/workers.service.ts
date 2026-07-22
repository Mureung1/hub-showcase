import { HttpError } from "../../common/errors/HttpError";
import { findPendingInvitationsByStoreId } from "../invitations/invitations.repository";
import { InvitationResponse, StoreInvitationRecord } from "../invitations/invitations.types";
import { findWorkerMembership, findWorkersByStoreId, updateWorkerMembership } from "./workers.repository";
import { UpdateWorkerInput, WorkerMemberRecord, WorkerResponse } from "./workers.types";

function toWorkerResponse(worker: WorkerMemberRecord): WorkerResponse {
  return {
    membershipId: worker.id,
    storeId: worker.store_id,
    userId: worker.user_id,
    name: worker.profiles.name,
    email: worker.profiles.email,
    phone: worker.profiles.phone,
    hourlyWage: worker.hourly_wage,
    defaultWorkStartTime: worker.default_work_start_time,
    defaultWorkEndTime: worker.default_work_end_time,
    joinedAt: worker.joined_at,
    createdAt: worker.created_at,
    updatedAt: worker.updated_at
  };
}

function toInvitationResponse(invitation: StoreInvitationRecord): InvitationResponse {
  return {
    id: invitation.id,
    storeId: invitation.store_id,
    invitedBy: invitation.invited_by,
    inviteeEmail: invitation.invitee_email,
    status: invitation.status,
    hourlyWage: invitation.hourly_wage,
    defaultWorkStartTime: invitation.default_work_start_time,
    defaultWorkEndTime: invitation.default_work_end_time,
    acceptedAt: invitation.accepted_at,
    createdAt: invitation.created_at,
    updatedAt: invitation.updated_at
  };
}

export async function listStoreWorkers(storeId: string) {
  const [workers, invitations] = await Promise.all([
    findWorkersByStoreId(storeId),
    findPendingInvitationsByStoreId(storeId)
  ]);

  return {
    workers: workers.map(toWorkerResponse),
    invitations: invitations.map(toInvitationResponse)
  };
}

export async function editWorker(input: UpdateWorkerInput) {
  const worker = await findWorkerMembership(input.storeId, input.workerId);

  if (!worker) {
    throw new HttpError(404, "알바생을 찾을 수 없습니다.", "WORKER_NOT_FOUND");
  }

  const updatedWorker = await updateWorkerMembership(input);

  return {
    worker: toWorkerResponse(updatedWorker)
  };
}
