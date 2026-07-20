export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface SessionState {
  loggedIn: boolean;
  github_login?: string;
  github_avatar_url?: string;
}

export interface RepoSummary {
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
}
