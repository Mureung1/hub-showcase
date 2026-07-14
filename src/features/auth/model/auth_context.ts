import { createContext } from 'react';

import type { AuthAction, AuthState } from './auth_types';

export type AuthContextValue = {
  authAction?: AuthAction;
  authErrorAction?: AuthAction;
  authErrorMessage?: string;
  authState: AuthState;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
