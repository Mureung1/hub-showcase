// test-writer Skill의 "test_" prefix 관례를 E2E에도 그대로 적용한다.
// 생성은 API로 직접(빠르고 안정적), 정리는 기존 DELETE /api/tasks/:id로 —
// 새 DB 정리 경로를 따로 만들지 않는다.
import type { APIRequestContext } from "@playwright/test";

export const TEST_PREFIX = "test_";

export function uniqueTitle(label: string): string {
  return `${TEST_PREFIX}${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type CreateTaskInput = {
  title: string;
  type: string;
  startTime: string;
  deadline: string;
  reason: string;
  customText?: string | null;
};

export async function createTask(
  request: APIRequestContext,
  baseURL: string,
  overrides: Partial<CreateTaskInput> = {},
): Promise<{ id: string; title: string }> {
  const input: CreateTaskInput = {
    title: uniqueTitle("task"),
    type: "개인공부",
    startTime: new Date(Date.now() - 60_000).toISOString(),
    deadline: new Date(Date.now() - 60_000).toISOString(),
    reason: "overwhelm",
    ...overrides,
  };

  const res = await request.post(`${baseURL}/api/tasks`, { data: input });
  const body = await res.json();
  return { id: body.data.id, title: body.data.title };
}

export async function deleteTask(
  request: APIRequestContext,
  baseURL: string,
  id: string,
): Promise<void> {
  await request.delete(`${baseURL}/api/tasks/${id}`);
}

// prefix로 남아있는 모든 test_ task를 정리한다 — 개별 delete가 누락돼도
// 스위트 시작/종료 시점에 안전망으로 쓴다.
export async function cleanupAllTestTasks(
  request: APIRequestContext,
  baseURL: string,
): Promise<void> {
  const res = await request.get(`${baseURL}/api/tasks`);
  const body = await res.json();
  const testTasks = (body.data as { id: string; title: string }[]).filter((t) =>
    t.title.startsWith(TEST_PREFIX),
  );
  await Promise.all(testTasks.map((t) => deleteTask(request, baseURL, t.id)));
}
