import { supabaseAdminClient } from "../../common/config/supabase";
import { ScheduleRecord } from "./schedules.types";

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
