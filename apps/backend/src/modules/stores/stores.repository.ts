import { supabaseAdminClient } from "../../common/config/supabase";
import { CreateStoreInput, CreateStoreWithOwnerRecord } from "./stores.types";

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
