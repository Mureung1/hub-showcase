import { supabaseAdminClient } from "../config/supabase";
import { StoreMembershipContext } from "../types/storeMembership";

type StoreMembershipRecord = {
  id: string;
  store_id: string;
  user_id: string;
  role: StoreMembershipContext["role"];
};

export async function findStoreMembership(storeId: string, userId: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_members")
    .select("id,store_id,user_id,role")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle<StoreMembershipRecord>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    storeId: data.store_id,
    userId: data.user_id,
    role: data.role
  };
}
