import { supabaseAdminClient } from "../../common/config/supabase";
import {
  CreateSubstituteRequestInput,
  SubstituteRequestRecord,
  SubstituteRequestStatus
} from "./substituteRequests.types";

const SUBSTITUTE_REQUEST_COLUMNS =
  "id,store_id,schedule_id,requester_id,candidate_worker_id,status,reason,reject_reason,created_at,updated_at";

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
