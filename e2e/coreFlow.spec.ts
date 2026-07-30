import { test, expect } from "@playwright/test";
import { createTask, deleteTask } from "./fixtures/testTask";

// 시나리오1(핵심 흐름): 등록 → Home → Focus 진입 → 완료 → History 확인.
// Lv2 도달까지 실제로 기다리지 않는다 — TaskCard의 "지금 시작" 버튼은 레벨과
// 무관하게 바로 Focus로 진입하는 별도 경로라(TaskCard.jsx:317), 자동 넛지
// 타이머(최소 수 초~수십 초, demo 모드 기준)를 기다리는 것보다 안정적이고 빠르다.
// Gemini/microtasks 호출은 이 경로에서 아예 발생하지 않지만, 혹시 넛지 모달이
// 먼저 뜨는 경합이 생기더라도 실제 Gemini API를 타지 않도록 라우트를 막아
// rule_based fallback 쪽만 타게 한다.
test.describe("핵심 흐름 (시나리오1)", () => {
  let taskId: string | null = null;

  test.afterEach(async ({ request, baseURL }) => {
    if (taskId) {
      await deleteTask(request, baseURL!, taskId);
      taskId = null;
    }
  });

  test("등록된 할일을 Focus에서 완료하면 History에 나타난다", async ({
    page,
    request,
    baseURL,
  }) => {
    // 실제 Gemini API를 절대 타지 않도록 차단 — 타면 rule_based fallback으로
    // 응답하는 서버 라우트가 대신 200을 주므로 테스트 흐름 자체는 안 끊긴다.
    await page.route("**/generativelanguage.googleapis.com/**", (route) =>
      route.abort(),
    );

    const task = await createTask(request, baseURL!, {
      title: `${Date.now()}_핵심흐름_과제`,
    });
    taskId = task.id;

    await page.goto("/home");
    const card = page.locator(".task-card", { hasText: task.title });
    await expect(card).toBeVisible();

    // waiting → active 전환은 ACTIVATION_POLL_MS(3s) 폴링이라 카드가 뜬 직후엔
    // "지금 시작" 버튼이 없을 수 있다 — 버튼이 나타날 때까지 기다린다.
    const startButton = card.getByRole("button", { name: "지금 시작" });
    await expect(startButton).toBeVisible({ timeout: 10_000 });
    await startButton.click();

    const completeButton = page.getByRole("button", { name: "완료", exact: true });
    await expect(completeButton).toBeVisible();
    await completeButton.click();

    await page.goto("/history");
    await expect(page.getByText(task.title)).toBeVisible();
  });
});
