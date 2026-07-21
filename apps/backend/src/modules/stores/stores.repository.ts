import { supabaseAdminClient } from "../../common/config/supabase";
import {
  CreateStoreInput,
  CreateStoreWithOwnerRecord,
  StoreMembershipWithStoreRecord,
  StoreRecord,
  UpdateStoreInput
} from "./stores.types";

const STORE_COLUMNS = "id,owner_id,name,address,created_at,updated_at";

type StoreMembershipQueryRecord = Omit<StoreMembershipWithStoreRecord, "stores"> & {
  stores: StoreRecord | StoreRecord[] | null;
};

function normalizeJoinedStore(stores: StoreMembershipQueryRecord["stores"]) {
  const store = Array.isArray(stores) ? stores[0] : stores;

  if (!store) {
    throw new Error("Store membership is missing store data.");
  }

  return store;
}

export async function createStoreWithOwner(input: CreateStoreInput) {
  const { data, error } = await supabaseAdminClient.rpc("create_store_with_owner", {
    p_owner_id: input.ownerId,
    p_name: input.name,
    p_address: input.address ?? null
  });

  if (error) {
    throw new Error(error.message);
  }

  const [record] = data as CreateStoreWithOwnerRecord[];

  if (!record) {
    throw new Error("Store creation returned no data.");
  }

  return record;
}

export async function findStoreById(storeId: string) {
  const { data, error } = await supabaseAdminClient
    .from("stores")
    .select(STORE_COLUMNS)
    .eq("id", storeId)
    .maybeSingle<StoreRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findStoresByUserId(userId: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_members")
    .select(
      `role,hourly_wage,default_work_start_time,default_work_end_time,joined_at,stores(${STORE_COLUMNS})`
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

export async function updateStore(input: UpdateStoreInput) {
  const updateValues: Partial<Pick<StoreRecord, "name" | "address">> = {};

  if (input.name !== undefined) {
    updateValues.name = input.name;
  }

  if (input.address !== undefined) {
    updateValues.address = input.address;
  }

  const { data, error } = await supabaseAdminClient
    .from("stores")
    .update(updateValues)
    .eq("id", input.storeId)
    .select(STORE_COLUMNS)
    .single<StoreRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
