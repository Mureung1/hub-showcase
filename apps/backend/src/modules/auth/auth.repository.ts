import { supabaseAdminClient } from "../../common/config/supabase";
import { CreateProfileInput, ProfileRecord } from "./auth.types";

const PROFILE_COLUMNS = "id,email,name,phone,created_at,updated_at";

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
