import { expect, test } from "@playwright/test";

test("public landing keeps the sample explicit and deterministic", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "흩어진 팀의 맥락을 하나의 뇌로." }),
  ).toBeVisible();
  await expect(page.getByText("분석 대기", { exact: true })).toBeVisible();
  await expect(page.getByText("샘플 데이터", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "샘플 불러오기" }).click();

  await expect(page.getByText("샘플 데이터", { exact: true })).toBeVisible();
  await expect(page.getByLabel("프로젝트 이름")).toHaveValue(
    "캠퍼스 공모전 서비스 기획",
  );
  await expect(
    page.getByRole("heading", { name: "참여자 프로젝트 관점" }),
  ).toBeVisible();
});

test("SPA routes and process health are available without a database", async ({
  page,
  request,
}) => {
  const live = await request.get("/api/health/live");
  expect(live.status()).toBe(200);

  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "이메일로 안전하게 시작하세요" }),
  ).toBeVisible();
  await expect(page.getByTestId("login-email")).toBeVisible();
});
