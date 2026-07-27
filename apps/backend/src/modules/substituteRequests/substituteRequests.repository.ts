import { supabaseAdminClient } from "../../common/config/supabase";
import {
  ApplySubstituteRequestInput,
  CreateSubstituteRequestInput,
  SubstituteApplicationRecord,
  SubstituteRequestProfileRecord,
  SubstituteRequestRecord,
  SubstituteRequestScheduleRecord,
  SubstituteRequestStatus
} from "./substituteRequests.types";

const SUBSTITUTE_REQUEST_COLUMNS =
  "id,store_id,schedule_id,requester_id,candidate_worker_id,status,reason,reject_reason,created_at,updated_at";
const SUBSTITUTE_APPLICATION_COLUMNS = "id,request_id,worker_id,created_at";
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

export async function findSubstituteRequestById(requestId: string) {
  const { data, error } = await supabaseAdminClient
    .from("substitute_requests")
    .select(SUBSTITUTE_REQUEST_COLUMNS)
    .eq("id", requestId)
    .maybeSingle<SubstituteRequestRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
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

export async function findSubstituteApplication(requestId: string, workerId: string) {
  const { data, error } = await supabaseAdminClient
    .from("substitute_applications")
    .select(SUBSTITUTE_APPLICATION_COLUMNS)
    .eq("request_id", requestId)
    .eq("worker_id", workerId)
    .limit(1)
    .maybeSingle<SubstituteApplicationRecord>();

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

export async function updateSubstituteRequestCandidate(input: ApplySubstituteRequestInput) {
  const { data, error } = await supabaseAdminClient
    .from("substitute_requests")
    .update({
      candidate_worker_id: input.actorUserId,
      status: "PENDING_APPROVAL"
    })
    .eq("id", input.requestId)
    .eq("status", "OPEN")
    .select(SUBSTITUTE_REQUEST_COLUMNS)
    .maybeSingle<SubstituteRequestRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function insertSubstituteApplication(input: ApplySubstituteRequestInput) {
  const { data, error } = await supabaseAdminClient
    .from("substitute_applications")
    .insert({
      request_id: input.requestId,
      worker_id: input.actorUserId
    })
    .select(SUBSTITUTE_APPLICATION_COLUMNS)
    .single<SubstituteApplicationRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
