import { UserRole } from "../../common/types/role";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELED";

export type StoreInvitationRecord = {
  id: string;
  store_id: string;
  invited_by: string;
  invitee_email: string;
  status: InvitationStatus;
  hourly_wage: number | null;
  default_work_start_time: string | null;
  default_work_end_time: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRecord = {
  id: string;
  email: string;
  name: string;
};

export type StoreMembershipRecord = {
  id: string;
  store_id: string;
  user_id: string;
  role: UserRole;
};

export type StoreSummaryRecord = {
  id: string;
  name: string;
  address: string | null;
};

export type StoreInvitationWithStoreRecord = StoreInvitationRecord & {
  stores: StoreSummaryRecord;
};

export type CreateInvitationInput = {
  storeId: string;
  invitedBy: string;
  inviteeEmail: string;
  hourlyWage?: number | null;
  defaultWorkStartTime?: string | null;
  defaultWorkEndTime?: string | null;
};

export type AcceptInvitationRpcRecord = {
  invitation_id: string;
  store_id: string;
  store_name: string;
  store_address: string | null;
  membership_id: string;
  membership_user_id: string;
  membership_role: UserRole;
  membership_hourly_wage: number | null;
  membership_default_work_start_time: string | null;
  membership_default_work_end_time: string | null;
  membership_joined_at: string;
};

export type InvitationResponse = {
  id: string;
  storeId: string;
  invitedBy: string;
  inviteeEmail: string;
  status: InvitationStatus;
  hourlyWage: number | null;
  defaultWorkStartTime: string | null;
  defaultWorkEndTime: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PendingInvitationResponse = InvitationResponse & {
  store: {
    id: string;
    name: string;
    address: string | null;
  };
};

export type AcceptInvitationResponse = {
  invitation: {
    id: string;
    status: "ACCEPTED";
  };
  store: {
    id: string;
    name: string;
    address: string | null;
  };
  membership: {
    id: string;
    userId: string;
    role: UserRole;
    hourlyWage: number | null;
    defaultWorkStartTime: string | null;
    defaultWorkEndTime: string | null;
    joinedAt: string;
  };
};
