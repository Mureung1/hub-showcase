import type { AuthUser } from './auth';
import type { Gender } from '../types';
import { ApiError } from './ApiError';
import { API_BASE_URL } from './config';

export interface ProfileInput {
  gender: Gender;
  birthYear: number;
  isPregnantOrLactating: boolean;
  heightCm: number;
  weightKg: number;
}

interface ErrorResponse {
  error: string;
}

export async function updateProfile(token: string, data: ProfileInput): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const result = (await res.json()) as AuthUser | ErrorResponse;
  if (!res.ok) {
    throw new ApiError((result as ErrorResponse).error ?? '요청에 실패했습니다.', res.status);
  }
  return result as AuthUser;
}
