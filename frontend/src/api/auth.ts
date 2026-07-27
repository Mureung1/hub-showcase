import type { Gender } from '../types';
import { API_BASE_URL } from './config';

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  gender: Gender | null;
  birthYear: number | null;
  isPregnantOrLactating: boolean | null;
  heightCm: number | null;
  weightKg: number | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface ErrorResponse {
  error: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T | ErrorResponse;
  if (!res.ok) {
    throw new Error((data as ErrorResponse).error ?? '요청에 실패했습니다.');
  }
  return data as T;
}

export function signup(email: string, password: string, name: string): Promise<AuthUser> {
  return postJson<AuthUser>('/auth/signup', { email, password, name: name || undefined });
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return postJson<LoginResponse>('/auth/login', { email, password });
}
