import { InvitationResponse } from "../invitations/invitations.types";

export type WorkerMemberRecord = {
  id: string;
  store_id: string;
  user_id: string;
  role: "WORKER";
  hourly_wage: number | null;
  default_work_start_time: string | null;
  default_work_end_time: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
  };
};

export type UpdateWorkerInput = {
  storeId: string;
  workerId: string;
  hourlyWage?: number | null;
  defaultWorkStartTime?: string | null;
  defaultWorkEndTime?: string | null;
};

export type WorkerResponse = {
  membershipId: string;
  storeId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  hourlyWage: number | null;
  defaultWorkStartTime: string | null;
  defaultWorkEndTime: string | null;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkersResponse = {
  workers: WorkerResponse[];
  invitations: InvitationResponse[];
};
