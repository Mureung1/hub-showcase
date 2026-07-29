import type { Profile } from '../types/profile';
import { apiGet, apiPatch } from './api';

interface ApiProfile {
  id: string;
  role: Profile['role'];
  name: string | null;
  phone: string | null;
  createdAt: string;
}

interface ProfileResponse {
  success: boolean;
  data: ApiProfile;
}

function mapProfile(api: ApiProfile): Profile {
  return {
    id: api.id,
    role: api.role,
    name: api.name,
    phone: api.phone,
    createdAt: api.createdAt,
  };
}

export async function fetchMyProfile(): Promise<Profile> {
  const res = await apiGet<ProfileResponse>('/api/v1/me');
  return mapProfile(res.data);
}

export async function updateMyProfile(payload: {
  name?: string | null;
  phone?: string | null;
}): Promise<Profile> {
  const res = await apiPatch<ProfileResponse>('/api/v1/me', payload);
  return mapProfile(res.data);
}
