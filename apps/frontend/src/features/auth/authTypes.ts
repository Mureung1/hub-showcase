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
