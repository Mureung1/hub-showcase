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
