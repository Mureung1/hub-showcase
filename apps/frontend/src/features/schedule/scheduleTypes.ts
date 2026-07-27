export type ScheduleSource = "MANUAL" | "RECURRING" | "SUBSTITUTE";

export type Schedule = {
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
  schedules: Schedule[];
};

export type CreateScheduleInput = {
  workerId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  position?: string | null;
  memo?: string | null;
};

export type CreateScheduleResponse = {
  schedule: Schedule;
};

export type UpdateScheduleInput = Partial<CreateScheduleInput>;

export type UpdateScheduleResponse = {
  schedule: Schedule;
};

export type RecurringScheduleRule = {
  id: string;
  storeId: string;
  workerId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecurringSchedulesInput = {
  workerId: string;
  weekday: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  position?: string | null;
  memo?: string | null;
};

export type CreateRecurringSchedulesResponse = {
  rule: RecurringScheduleRule;
  schedules: Schedule[];
};
