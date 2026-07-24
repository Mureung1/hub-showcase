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

export type CreateScheduleInput = {
  storeId: string;
  workerId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  position: string | null;
  memo: string | null;
};

export type CreateScheduleRepositoryInput = CreateScheduleInput & {
  source: ScheduleSource;
};

export type CreateScheduleResponse = {
  schedule: ScheduleResponse;
};

export type UpdateScheduleInput = {
  scheduleId: string;
  actorUserId: string;
  workerId?: string;
  workDate?: string;
  startTime?: string;
  endTime?: string;
  position?: string | null;
  memo?: string | null;
};

export type UpdateScheduleRepositoryInput = {
  scheduleId: string;
  workerId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  position: string | null;
  memo: string | null;
};

export type UpdateScheduleResponse = {
  schedule: ScheduleResponse;
};

export type DeleteScheduleInput = {
  scheduleId: string;
  actorUserId: string;
};

export type RecurringScheduleRuleRecord = {
  id: string;
  store_id: string;
  worker_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string | null;
  position: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type RecurringScheduleRuleResponse = {
  id: string;
  storeId: string;
  workerId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string | null;
  position: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecurringSchedulesInput = {
  storeId: string;
  workerId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  position: string | null;
  memo: string | null;
};

export type CreateRecurringScheduleRuleRepositoryInput = CreateRecurringSchedulesInput;

export type BulkScheduleRepositoryInput = {
  storeId: string;
  workerId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  position: string | null;
  memo: string | null;
  source: "RECURRING";
};

export type CreateRecurringSchedulesResponse = {
  rule: RecurringScheduleRuleResponse;
  schedules: ScheduleResponse[];
};
