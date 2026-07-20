import { supabaseAdminClient } from "../../common/config/supabase";
import { CreateProfileInput, ProfileRecord, StoreMembershipRecord } from "./auth.types";

const PROFILE_COLUMNS = "id,email,name,phone,created_at,updated_at";

type StoreMembershipQueryRecord = Omit<StoreMembershipRecord, "stores"> & {
  stores: StoreMembershipRecord["stores"] | StoreMembershipRecord["stores"][] | null;
};

function normalizeJoinedStore(stores: StoreMembershipQueryRecord["stores"]) {
  const store = Array.isArray(stores) ? stores[0] : stores;

  if (!store) {
    throw new Error("Store membership is missing store data.");
  }

  return store;
}

export async function findProfileById(userId: string) {
  const { data, error } = await supabaseAdminClient
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<ProfileRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createProfile(input: CreateProfileInput) {
  const { data, error } = await supabaseAdminClient
    .from("profiles")
    .insert({
      id: input.userId,
      email: input.email,
      name: input.name
    })
    .select(PROFILE_COLUMNS)
    .single<ProfileRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findStoreMembershipsByUserId(userId: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_members")
    .select(
      "role,hourly_wage,default_work_start_time,default_work_end_time,joined_at,stores(id,name,address)"
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as StoreMembershipQueryRecord[]).map((membership) => {
    return {
      ...membership,
      stores: normalizeJoinedStore(membership.stores)
    };
  });
}
