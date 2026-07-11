import { expect, test } from "@playwright/test";

test("public landing keeps the sample explicit and deterministic", async ({
  page,
  request,
}) => {
  await page.goto("/");

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://modu-brain-demo.onrender.com/og.png",
  );
  const socialPreview = await request.get("/og.png");
  expect(socialPreview.status()).toBe(200);
  expect(socialPreview.headers()["content-type"]).toContain("image/png");

  await expect(
    page.getByRole("heading", { name: "결론은 남지만, 왜 그렇게 정했는지는 사라집니다." }),
  ).toBeVisible();
  await expect(page.getByText("분석 대기", { exact: true })).toBeVisible();
  await expect(page.getByText("샘플 데이터", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "샘플 불러오기" }).click();

  await expect(page.getByText("샘플 데이터", { exact: true })).toBeVisible();
  await expect(page.getByLabel("프로젝트 이름")).toHaveValue(
    "캠퍼스 공모전 서비스 기획",
  );
  await expect(
    page.getByRole("heading", { name: "참여자별 관점 차이" }),
  ).toBeVisible();
});

test("public demo is one click away and requires no account", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "샘플 직접 체험" }).click();

  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByRole("heading", { name: "로그인 없이 확인하는 근거 기반 맥락 분석" }),
  ).toBeVisible();
  await expect(page.getByText("샘플 데이터", { exact: true })).toBeVisible();
  await expect(page.getByLabel("프로젝트 이름")).toHaveValue(
    "캠퍼스 공모전 서비스 기획",
  );
});

test("SPA routes and process health are available without a database", async ({
  page,
  request,
}) => {
  const live = await request.get("/api/health/live");
  expect(live.status()).toBe(200);
  const livePayload = await live.json();
  expect(livePayload).toMatchObject({ data: { status: "ok" } });
  if (process.env.E2E_EXPECTED_COMMIT) {
    expect(livePayload.data.commit).toBe(process.env.E2E_EXPECTED_COMMIT.toLowerCase());
  }

  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "이메일로 안전하게 시작하세요" }),
  ).toBeVisible();
  await expect(page.getByTestId("login-email")).toBeVisible();
});
