// 클라이언트 → 서버 API 헬퍼
import type { AppStateBlob, Attempt, Situation, ThreadItem, Profile } from "@/lib/domain/types";

export interface ScoreResult extends Attempt {
  total: number;
}

export async function fetchState(): Promise<{ state: AppStateBlob | null; persisted: boolean }> {
  try {
    const r = await fetch("/api/state", { cache: "no-store" });
    return await r.json();
  } catch {
    return { state: null, persisted: false };
  }
}

export async function putState(state: AppStateBlob): Promise<boolean> {
  try {
    const r = await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    const j = await r.json();
    return !!j.persisted;
  } catch {
    return false;
  }
}

export async function scoreDraft(input: {
  situationId?: string;
  customSit?: Situation;
  draft: string;
  thread?: ThreadItem[];
  profile?: Profile | null;
  emailSubject?: string;
}): Promise<ScoreResult> {
  const r = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "채점에 실패했습니다.");
  return j as ScoreResult;
}

// ── 계정 ─────────────────────────────────────────────────────────────
export interface Me {
  user: { email: string } | null;
  authAvailable: boolean;
}

export async function fetchMe(): Promise<Me> {
  try {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    return await r.json();
  } catch {
    return { user: null, authAvailable: false };
  }
}

async function authPost(path: string, body?: unknown): Promise<{ email: string } | null> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "요청에 실패했습니다.");
  return j.user ?? null;
}

export const login = (email: string, password: string) => authPost("/api/auth/login", { email, password });
export const signup = (email: string, password: string) => authPost("/api/auth/signup", { email, password });
export const logout = () => authPost("/api/auth/logout");

export async function generateSituation(input: {
  title: string;
  who?: string;
  goal?: string;
  tension?: string;
}): Promise<Situation> {
  const r = await fetch("/api/situation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "상황 생성에 실패했습니다.");
  return j.situation as Situation;
}
