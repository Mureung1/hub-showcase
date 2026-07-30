import { test, expect } from "@playwright/test";

// RegisterPage.jsx의 handleSubmit: validateTaskTitle → validateDeadline 순서로
// 검증하고, 실패하면 role="alert" 인라인 에러를 띄운 뒤 apiFetch를 호출하지 않는다.
test.describe("등록 폼 빈값 검증 (시나리오3)", () => {
  test("제목을 비운 채 제출하면 에러가 뜨고 API 요청이 발생하지 않는다", async ({ page }) => {
    let apiCalled = false;
    await page.route("**/api/tasks", (route) => {
      apiCalled = true;
      route.continue();
    });

    await page.goto("/register");
    await page.getByLabel("마감까지 D-day").fill("3");
    await page.getByRole("button", { name: "할 일 등록하기" }).click();

    await expect(page.getByRole("alert")).toHaveText("제목을 입력해주세요.");
    expect(apiCalled).toBe(false);
    await expect(page).toHaveURL(/\/register$/);
  });

  test("D-day를 비운 채 제출하면 에러가 뜨고 API 요청이 발생하지 않는다", async ({ page }) => {
    let apiCalled = false;
    await page.route("**/api/tasks", (route) => {
      apiCalled = true;
      route.continue();
    });

    await page.goto("/register");
    await page.getByLabel("제목").fill("자료구조 과제 제출하기");
    await page.getByRole("button", { name: "할 일 등록하기" }).click();

    await expect(page.getByRole("alert")).toHaveText("마감까지 D-day를 입력해주세요.");
    expect(apiCalled).toBe(false);
    await expect(page).toHaveURL(/\/register$/);
  });
});
