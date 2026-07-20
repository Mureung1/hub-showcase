export type ProfileRecord = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileResponse = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoreMembershipRecord = {
  role: "OWNER" | "WORKER";
  hourly_wage: number | null;
  default_work_start_time: string | null;
  default_work_end_time: string | null;
  joined_at: string;
  stores: {
    id: string;
    name: string;
    address: string | null;
  };
};

export type CurrentUserStoreResponse = {
  id: string;
  name: string;
  address: string | null;
  role: "OWNER" | "WORKER";
  hourlyWage: number | null;
  defaultWorkStartTime: string | null;
  defaultWorkEndTime: string | null;
  joinedAt: string;
};

export type CurrentUserResponse = {
  profile: ProfileResponse;
  stores: CurrentUserStoreResponse[];
};

export type CreateProfileInput = {
  userId: string;
  email: string;
  name: string;
};
