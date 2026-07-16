export interface VerifiedAuthUser {
  id: string;
  emailConfirmed?: boolean;
}

export interface AuthVerifier {
  verify(accessToken: string): Promise<VerifiedAuthUser | null>;
}
