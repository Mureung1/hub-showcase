export type ProfileRole = 'user' | 'trainer' | 'gym_owner';

export interface Profile {
  id: string;
  role: ProfileRole;
  name: string | null;
  phone: string | null;
  createdAt: string;
}
