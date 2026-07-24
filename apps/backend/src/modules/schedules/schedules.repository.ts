import { supabaseAdminClient } from "../../common/config/supabase";
import { CreateScheduleRepositoryInput, ScheduleRecord, UpdateScheduleRepositoryInput } from "./schedules.types";

const SCHEDULE_COLUMNS =
  "id,store_id,worker_id,work_date,start_time,end_time,position,memo,source,created_at,updated_at,profiles(id,name)";

type ScheduleQueryRecord = Omit<ScheduleRecord, "profiles"> & {
  profiles: ScheduleRecord["profiles"] | ScheduleRecord["profiles"][] | null;
};

function normalizeJoinedProfile(profiles: ScheduleQueryRecord["profiles"]) {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;

  if (!profile) {
    throw new Error("Schedule is missing worker profile data.");
  }

  return profile;
}

export async function findSchedulesByStoreAndDateRange(storeId: string, fromDate: string, toDate: string) {
  const { data, error } = await supabaseAdminClient
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("store_id", storeId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as ScheduleQueryRecord[]).map((schedule) => {
    return {
      ...schedule,
      profiles: normalizeJoinedProfile(schedule.profiles)
    };
  });
}

export async function findScheduleById(scheduleId: string) {
  const { data, error } = await supabaseAdminClient
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("id", scheduleId)
    .maybeSingle<ScheduleQueryRecord>();

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

export async function findOverlappingWorkerSchedules(input: {
  storeId: string;
  workerId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  excludeScheduleId?: string;
}) {
  let query = supabaseAdminClient
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("store_id", input.storeId)
    .eq("worker_id", input.workerId)
    .eq("work_date", input.workDate)
    .lt("start_time", input.endTime)
    .gt("end_time", input.startTime);

  if (input.excludeScheduleId) {
    query = query.neq("id", input.excludeScheduleId);
  }

  const { data, error } = await query
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as ScheduleQueryRecord[]).map((schedule) => {
    return {
      ...schedule,
      profiles: normalizeJoinedProfile(schedule.profiles)
    };
  });
}

export async function insertSchedule(input: CreateScheduleRepositoryInput) {
  const { data, error } = await supabaseAdminClient
    .from("schedules")
    .insert({
      store_id: input.storeId,
      worker_id: input.workerId,
      work_date: input.workDate,
      start_time: input.startTime,
      end_time: input.endTime,
      position: input.position,
      memo: input.memo,
      source: input.source
    })
    .select(SCHEDULE_COLUMNS)
    .single<ScheduleQueryRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    profiles: normalizeJoinedProfile(data.profiles)
  };
}

export async function updateScheduleById(input: UpdateScheduleRepositoryInput) {
  const { data, error } = await supabaseAdminClient
    .from("schedules")
    .update({
      worker_id: input.workerId,
      work_date: input.workDate,
      start_time: input.startTime,
      end_time: input.endTime,
      position: input.position,
      memo: input.memo
    })
    .eq("id", input.scheduleId)
    .select(SCHEDULE_COLUMNS)
    .single<ScheduleQueryRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    profiles: normalizeJoinedProfile(data.profiles)
  };
}

export async function deleteScheduleById(scheduleId: string) {
  const { error } = await supabaseAdminClient
    .from("schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    throw new Error(error.message);
  }
}
