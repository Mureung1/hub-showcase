export type AuthAction = 'sign-in' | 'sign-out';

export type AuthUser = {
  avatarUrl?: string;
  displayName: string;
  email?: string;
  id: string;
};

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: AuthUser };
