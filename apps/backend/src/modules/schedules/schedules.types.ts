export type ScheduleSource = "MANUAL" | "RECURRING" | "SUBSTITUTE";

export type ScheduleRecord = {
  id: string;
  store_id: string;
  worker_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  position: string | null;
  memo: string | null;
  source: ScheduleSource;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    name: string;
  };
};

export type ScheduleResponse = {
  id: string;
  storeId: string;
  workerId: string;
  workerName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  position: string | null;
  memo: string | null;
  source: ScheduleSource;
  createdAt: string;
  updatedAt: string;
};

export type SchedulesResponse = {
  schedules: ScheduleResponse[];
};
