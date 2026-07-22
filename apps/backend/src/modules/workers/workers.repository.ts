import { supabaseAdminClient } from "../../common/config/supabase";
import { UpdateWorkerInput, WorkerMemberRecord } from "./workers.types";

const WORKER_COLUMNS =
  "id,store_id,user_id,role,hourly_wage,default_work_start_time,default_work_end_time,joined_at,created_at,updated_at,profiles(id,email,name,phone)";

type WorkerMemberQueryRecord = Omit<WorkerMemberRecord, "profiles"> & {
  profiles: WorkerMemberRecord["profiles"] | WorkerMemberRecord["profiles"][] | null;
};

function normalizeJoinedProfile(profiles: WorkerMemberQueryRecord["profiles"]) {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;

  if (!profile) {
    throw new Error("Worker membership is missing profile data.");
  }

  return profile;
}

export async function findWorkersByStoreId(storeId: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_members")
    .select(WORKER_COLUMNS)
    .eq("store_id", storeId)
    .eq("role", "WORKER")
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as WorkerMemberQueryRecord[]).map((worker) => {
    return {
      ...worker,
      profiles: normalizeJoinedProfile(worker.profiles)
    };
  });
}

export async function findWorkerMembership(storeId: string, workerId: string) {
  const { data, error } = await supabaseAdminClient
    .from("store_members")
    .select(WORKER_COLUMNS)
    .eq("store_id", storeId)
    .eq("user_id", workerId)
    .eq("role", "WORKER")
    .maybeSingle<WorkerMemberQueryRecord>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    profiles: normalizeJoinedProfile(data.profiles)
  };
}

export async function updateWorkerMembership(input: UpdateWorkerInput) {
  const updateValues: Partial<
    Pick<WorkerMemberRecord, "hourly_wage" | "default_work_start_time" | "default_work_end_time">
  > = {};

  if (input.hourlyWage !== undefined) {
    updateValues.hourly_wage = input.hourlyWage;
  }

  if (input.defaultWorkStartTime !== undefined) {
    updateValues.default_work_start_time = input.defaultWorkStartTime;
  }

  if (input.defaultWorkEndTime !== undefined) {
    updateValues.default_work_end_time = input.defaultWorkEndTime;
  }

  const { data, error } = await supabaseAdminClient
    .from("store_members")
    .update(updateValues)
    .eq("store_id", input.storeId)
    .eq("user_id", input.workerId)
    .eq("role", "WORKER")
    .select(WORKER_COLUMNS)
    .single<WorkerMemberQueryRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    profiles: normalizeJoinedProfile(data.profiles)
  };
}
