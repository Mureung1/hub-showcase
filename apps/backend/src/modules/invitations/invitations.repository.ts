import { supabaseAdminClient } from "../../common/config/supabase";
import {
  AcceptInvitationRpcRecord,
  CreateInvitationInput,
  ProfileRecord,
  StoreInvitationRecord,
  StoreInvitationWithStoreRecord,
  StoreMembershipRecord,
  StoreSummaryRecord
} from "./invitations.types";

const INVITATION_COLUMNS =
  "id,store_id,invited_by,invitee_email,status,hourly_wage,default_work_start_time,default_work_end_time,accepted_at,created_at,updated_at";

type StoreInvitationQueryRecord = Omit<StoreInvitationWithStoreRecord, "stores"> & {
  stores: StoreSummaryRecord | StoreSummaryRecord[] | null;
};

function normalizeJoinedStore(stores: StoreInvitationQueryRecord["stores"]) {
  const store = Array.isArray(stores) ? stores[0] : stores;

  if (!store) {
    throw new Error("Invitation is missing store data.");
  }

  return store;
}

export async function findProfileByEmail(email: string) {
  const { data, error } = await supabaseAdminClient
    .from("profiles")
    .select("id,email,name")
    .ilike("email", email)
    .maybeSingle<ProfileRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findMembershipByStoreAndUser(storeId: string, userId: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_members")
    .select("id,store_id,user_id,role")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle<StoreMembershipRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findPendingInvitationByStoreAndEmail(storeId: string, inviteeEmail: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_invitations")
    .select(INVITATION_COLUMNS)
    .eq("store_id", storeId)
    .eq("status", "PENDING")
    .ilike("invitee_email", inviteeEmail)
    .maybeSingle<StoreInvitationRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function insertInvitation(input: CreateInvitationInput) {
  const { data, error } = await supabaseAdminClient
    .from("store_invitations")
    .insert({
      store_id: input.storeId,
      invited_by: input.invitedBy,
      invitee_email: input.inviteeEmail,
      hourly_wage: input.hourlyWage ?? null,
      default_work_start_time: input.defaultWorkStartTime ?? null,
      default_work_end_time: input.defaultWorkEndTime ?? null
    })
    .select(INVITATION_COLUMNS)
    .single<StoreInvitationRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findInvitationById(invitationId: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_invitations")
    .select(INVITATION_COLUMNS)
    .eq("id", invitationId)
    .maybeSingle<StoreInvitationRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function cancelInvitation(invitationId: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_invitations")
    .update({
      status: "CANCELED"
    })
    .eq("id", invitationId)
    .eq("status", "PENDING")
    .select(INVITATION_COLUMNS)
    .single<StoreInvitationRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findPendingInvitationsByEmail(inviteeEmail: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_invitations")
    .select(`${INVITATION_COLUMNS},stores(id,name,address)`)
    .eq("status", "PENDING")
    .ilike("invitee_email", inviteeEmail)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as StoreInvitationQueryRecord[]).map((invitation) => {
    return {
      ...invitation,
      stores: normalizeJoinedStore(invitation.stores)
    };
  });
}

export async function findPendingInvitationsByStoreId(storeId: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_invitations")
    .select(INVITATION_COLUMNS)
    .eq("store_id", storeId)
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as StoreInvitationRecord[];
}

export async function acceptInvitation(input: { invitationId: string; userId: string; userEmail: string }) {
  const { data, error } = await supabaseAdminClient.rpc("accept_store_invitation", {
    p_invitation_id: input.invitationId,
    p_user_id: input.userId,
    p_user_email: input.userEmail
  });

  if (error) {
    throw new Error(error.message);
  }

  const [record] = data as AcceptInvitationRpcRecord[];

  if (!record) {
    throw new Error("Invitation acceptance returned no data.");
  }

  return record;
}
