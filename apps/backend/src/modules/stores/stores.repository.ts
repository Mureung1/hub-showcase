import { supabaseAdminClient } from "../../common/config/supabase";
import { CreateStoreInput, CreateStoreWithOwnerRecord, StoreRecord, UpdateStoreInput } from "./stores.types";

const STORE_COLUMNS = "id,owner_id,name,address,created_at,updated_at";

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
