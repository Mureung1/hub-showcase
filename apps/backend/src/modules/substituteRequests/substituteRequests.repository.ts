import { supabaseAdminClient } from "../../common/config/supabase";
import {
  CreateSubstituteRequestInput,
  SubstituteRequestProfileRecord,
  SubstituteRequestRecord,
  SubstituteRequestScheduleRecord,
  SubstituteRequestStatus
} from "./substituteRequests.types";

const SUBSTITUTE_REQUEST_COLUMNS =
  "id,store_id,schedule_id,requester_id,candidate_worker_id,status,reason,reject_reason,created_at,updated_at";
const SUBSTITUTE_REQUEST_SCHEDULE_COLUMNS = "id,worker_id,work_date,start_time,end_time,position,memo";
const SUBSTITUTE_REQUEST_PROFILE_COLUMNS = "id,name";

export async function findOpenSubstituteRequestsByStoreId(storeId: string) {
  const { data, error } = await supabaseAdminClient
    .from("substitute_requests")
    .select(SUBSTITUTE_REQUEST_COLUMNS)
    .eq("store_id", storeId)
    .eq("status", "OPEN");

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as SubstituteRequestRecord[];
}

export async function findSubstituteRequestSchedules(scheduleIds: string[]) {
  if (scheduleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdminClient
    .from("schedules")
    .select(SUBSTITUTE_REQUEST_SCHEDULE_COLUMNS)
    .in("id", scheduleIds);

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as SubstituteRequestScheduleRecord[];
}

export async function findSubstituteRequestProfiles(profileIds: string[]) {
  if (profileIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdminClient
    .from("profiles")
    .select(SUBSTITUTE_REQUEST_PROFILE_COLUMNS)
    .in("id", profileIds);

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as SubstituteRequestProfileRecord[];
}

export async function findActiveSubstituteRequestByScheduleId(
  scheduleId: string,
  activeStatuses: SubstituteRequestStatus[]
) {
  const { data, error } = await supabaseAdminClient
    .from("substitute_requests")
    .select(SUBSTITUTE_REQUEST_COLUMNS)
    .eq("schedule_id", scheduleId)
    .in("status", activeStatuses)
    .limit(1)
    .maybeSingle<SubstituteRequestRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function insertSubstituteRequest(input: CreateSubstituteRequestInput) {
  const { data, error } = await supabaseAdminClient
    .from("substitute_requests")
    .insert({
      store_id: input.storeId,
      schedule_id: input.scheduleId,
      requester_id: input.requesterId,
      status: "OPEN",
      reason: input.reason
    })
    .select(SUBSTITUTE_REQUEST_COLUMNS)
    .single<SubstituteRequestRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
