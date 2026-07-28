// ShowUp 인증 상태 관리
// React Hook 기반 인증 상태 관리.
// 실제 상태는 Firebase Auth 가 소유한다.

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { subscribeToAuth, signOutUser } from '../services/auth';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setState({ user, loading: false, error: null });
    });

    return unsubscribe;
  }, []);

  return state;
}

export async function logout(): Promise<void> {
  await signOutUser();
}

/**
 * 현재 로그인한 사용자의 storeId 를 가져온다.
 * storeId 는 ownerUid 와 동일하다.
 */
export function getCurrentStoreId(user: User | null): string | null {
  return user?.uid ?? null;
}
