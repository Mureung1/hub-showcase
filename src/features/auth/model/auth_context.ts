import { createContext } from 'react';

import type { MobileOAuthContext } from '@/shared/capacitor';

import type { AuthAction, AuthState } from './auth_types';

export type AuthContextValue = {
  androidShareOAuthCallbackRevision: number;
  authAction?: AuthAction;
  authErrorAction?: AuthAction;
  authErrorMessage?: string;
  authState: AuthState;
  signInWithGoogle: (context?: MobileOAuthContext) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
