import { HttpError } from "../../common/errors/HttpError";
import { normalizeEmail } from "../../common/utils/email";
import {
  acceptInvitation,
  cancelInvitation,
  findInvitationById,
  findMembershipByStoreAndUser,
  findPendingInvitationByStoreAndEmail,
  findPendingInvitationsByEmail,
  findProfileByEmail,
  insertInvitation
} from "./invitations.repository";
import {
  AcceptInvitationRpcRecord,
  CreateInvitationInput,
  InvitationResponse,
  PendingInvitationResponse,
  StoreInvitationRecord,
  StoreInvitationWithStoreRecord
} from "./invitations.types";

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

function toPendingInvitationResponse(invitation: StoreInvitationWithStoreRecord): PendingInvitationResponse {
  return {
    ...toInvitationResponse(invitation),
    store: {
      id: invitation.stores.id,
      name: invitation.stores.name,
      address: invitation.stores.address
    }
  };
}

function toAcceptInvitationResponse(record: AcceptInvitationRpcRecord) {
  return {
    invitation: {
      id: record.invitation_id,
      status: "ACCEPTED" as const
    },
    store: {
      id: record.store_id,
      name: record.store_name,
      address: record.store_address
    },
    membership: {
      id: record.membership_id,
      userId: record.membership_user_id,
      role: record.membership_role,
      hourlyWage: record.membership_hourly_wage,
      defaultWorkStartTime: record.membership_default_work_start_time,
      defaultWorkEndTime: record.membership_default_work_end_time,
      joinedAt: record.membership_joined_at
    }
  };
}

function mapAcceptInvitationError(error: unknown): never {
  const message = error instanceof Error ? error.message : "초대 수락에 실패했습니다.";

  if (message.includes("INVITATION_NOT_FOUND")) {
    throw new HttpError(404, "초대를 찾을 수 없습니다.", "INVITATION_NOT_FOUND");
  }

  if (message.includes("INVITATION_NOT_PENDING")) {
    throw new HttpError(409, "이미 처리된 초대입니다.", "INVITATION_NOT_PENDING");
  }

  if (message.includes("INVITATION_EMAIL_MISMATCH")) {
    throw new HttpError(403, "현재 계정으로 수락할 수 없는 초대입니다.", "INVITATION_EMAIL_MISMATCH");
  }

  if (message.includes("PROFILE_NOT_FOUND")) {
    throw new HttpError(404, "프로필을 먼저 생성해주세요.", "PROFILE_NOT_FOUND");
  }

  if (message.includes("ALREADY_STORE_MEMBER")) {
    throw new HttpError(409, "이미 매장에 소속된 사용자입니다.", "ALREADY_STORE_MEMBER");
  }

  throw error;
}

export async function createInvitation(input: CreateInvitationInput) {
  const inviteeEmail = normalizeEmail(input.inviteeEmail);
  const profile = await findProfileByEmail(inviteeEmail);

  if (profile) {
    const membership = await findMembershipByStoreAndUser(input.storeId, profile.id);

    if (membership) {
      throw new HttpError(400, "이미 매장에 소속된 사용자입니다.", "ALREADY_STORE_MEMBER");
    }
  }

  const pendingInvitation = await findPendingInvitationByStoreAndEmail(input.storeId, inviteeEmail);

  if (pendingInvitation) {
    throw new HttpError(409, "이미 대기 중인 초대가 있습니다.", "PENDING_INVITATION_EXISTS");
  }

  const invitation = await insertInvitation({
    ...input,
    inviteeEmail
  });

  return {
    invitation: toInvitationResponse(invitation)
  };
}

export async function cancelPendingInvitation(input: { storeId: string; invitationId: string }) {
  const invitation = await findInvitationById(input.invitationId);

  if (!invitation || invitation.store_id !== input.storeId) {
    throw new HttpError(404, "초대를 찾을 수 없습니다.", "INVITATION_NOT_FOUND");
  }

  if (invitation.status !== "PENDING") {
    throw new HttpError(409, "이미 처리된 초대입니다.", "INVITATION_NOT_PENDING");
  }

  const canceledInvitation = await cancelInvitation(input.invitationId);

  return {
    invitation: toInvitationResponse(canceledInvitation)
  };
}

export async function listPendingInvitationsForUser(userEmail: string) {
  const invitations = await findPendingInvitationsByEmail(normalizeEmail(userEmail));

  return {
    invitations: invitations.map(toPendingInvitationResponse)
  };
}

export async function acceptPendingInvitation(input: { invitationId: string; userId: string; userEmail: string }) {
  try {
    const record = await acceptInvitation({
      invitationId: input.invitationId,
      userId: input.userId,
      userEmail: normalizeEmail(input.userEmail)
    });

    return toAcceptInvitationResponse(record);
  } catch (error) {
    mapAcceptInvitationError(error);
  }
}
