import { readJson } from "./jsonStore";
import { dataPath } from "./paths";

export const SESSION_FILE = dataPath("session.json");

export interface StoredSession {
  github_login: string;
  github_avatar_url: string;
  access_token: string;
  expires_at: string | null;
}

export async function getSession(): Promise<StoredSession | null> {
  try {
    return await readJson<StoredSession>(SESSION_FILE);
  } catch {
    return null;
  }
}
