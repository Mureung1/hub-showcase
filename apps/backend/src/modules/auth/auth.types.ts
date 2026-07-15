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

export type CreateProfileInput = {
  userId: string;
  email: string;
  name: string;
};
