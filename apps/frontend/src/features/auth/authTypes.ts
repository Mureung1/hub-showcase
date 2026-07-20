export type Profile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProfileResponse = {
  profile: Profile;
};

export type CurrentUserStore = {
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
  profile: Profile;
  stores: CurrentUserStore[];
};
