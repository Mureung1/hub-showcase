export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELED";

export type Invitation = {
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

export type PendingInvitation = Invitation & {
  store: {
    id: string;
    name: string;
    address: string | null;
  };
};

export type CreateInvitationResponse = {
  invitation: Invitation;
};

export type CancelInvitationResponse = {
  invitation: Invitation;
};

export type PendingInvitationsResponse = {
  invitations: PendingInvitation[];
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
    role: "OWNER" | "WORKER";
    hourlyWage: number | null;
    defaultWorkStartTime: string | null;
    defaultWorkEndTime: string | null;
    joinedAt: string;
  };
};
