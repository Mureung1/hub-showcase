import type { Invitation } from "../invitation";

export type Worker = {
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
  workers: Worker[];
  invitations: Invitation[];
};

export type UpdateWorkerResponse = {
  worker: Worker;
};
