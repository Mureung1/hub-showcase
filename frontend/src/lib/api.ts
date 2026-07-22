import type { Credential, DocType, Position, PositionDetail } from "./types";

/**
 * 백엔드(Spring Boot :8080) 연동 클라이언트.
 *
 * mock.ts 와 같은 시그니처를 갖는다. 화면 컴포넌트는 어느 쪽을 쓰든 그대로다.
 * 목업 → 실연동 전환은 페이지의 import 한 줄만 바꾸면 된다.
 *
 *   - import { listPositions } from "@/lib/mock";
 *   + import { listPositions } from "@/lib/api";
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // 백엔드 GlobalExceptionHandler 가 { code, message } 로 내려준다
    const body = await res.json().catch(() => ({ message: "요청에 실패했습니다." }));
    throw new ApiError(res.status, body.message);
  }

  // 202/204 등 본문 없는 응답도 안전하게 처리
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── F1 인증 ── */

export async function signUp(email: string, password: string, name: string) {
  const res = await request<{ accessToken: string; refreshToken: string; userId: number }>(
    "/auth/signup",
    { method: "POST", body: JSON.stringify({ email, password, name }) },
  );
  window.localStorage.setItem("accessToken", res.accessToken);
  return res;
}

export async function login(email: string, password: string) {
  const res = await request<{ accessToken: string; refreshToken: string; userId: number }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  window.localStorage.setItem("accessToken", res.accessToken);
  return res;
}

/* ── F2 이력 ── */

export const listCredentials = () => request<Credential[]>("/credentials");

export const createCredential = (body: Omit<Credential, "id">) =>
  request<Credential>("/credentials", { method: "POST", body: JSON.stringify(body) });

export const deleteCredential = (id: string) =>
  request<void>(`/credentials/${id}`, { method: "DELETE" });

export const getCompleteness = () =>
  request<{ percentage: number; missing: string[] }>("/credentials/completeness");

/* ── F4·F5 포지션 ── */

export const listPositions = () => request<Position[]>("/positions");

export const getPosition = (id: string) => request<PositionDetail>(`/positions/${id}`);

/** 이력을 고친 뒤 호출해 적합도를 다시 계산한다. */
export const recalculate = () => request<void>("/positions/recalculate", { method: "POST" });

/* ── F6 AI 문서 (비동기 잡) ── */

interface DocJob {
  id: number;
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  content?: string;
  errorMessage?: string;
}

/** 잡을 만들고 id만 받는다. 즉시 반환된다. */
export const generateDoc = (postingId: number, type: DocType) =>
  request<DocJob>("/documents", {
    method: "POST",
    body: JSON.stringify({
      postingId,
      type: type === "resume" ? "RESUME" : "COVER_LETTER",
    }),
  });

/**
 * DONE 이 될 때까지 폴링. DocEditor 의 regenerate() 가 이걸 부른다.
 * LLM 호출이 수십 초 걸리므로 화면은 그동안 스켈레톤을 띄운다.
 */
export async function pollDoc(id: number, timeoutMs = 90_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const doc = await request<DocJob>(`/documents/${id}`);

    if (doc.status === "DONE") return doc.content ?? "";
    if (doc.status === "FAILED") throw new Error(doc.errorMessage ?? "문서를 만들지 못했습니다.");

    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error("문서 생성이 예상보다 오래 걸립니다. 잠시 후 다시 확인해 주세요.");
}

export const saveDoc = (id: number, content: string) =>
  request<DocJob>(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
