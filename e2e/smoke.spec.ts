import { test, expect } from "@playwright/test";

test("랜딩 페이지가 뜬다 (Playwright 설정 스모크 테스트)", async ({ page }) => {
  await page.goto("/landing");
  await expect(page).toHaveTitle("잔소리봇");
});
