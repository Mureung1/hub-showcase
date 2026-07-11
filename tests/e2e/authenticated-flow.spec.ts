import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testEmail = process.env.E2E_TEST_EMAIL;
const hasAuthEnvironment = Boolean(supabaseUrl && serviceRoleKey && testEmail);

test.skip(
  !hasAuthEnvironment,
  "A dedicated Supabase test environment is required.",
);

test("login, persist two analyses, inspect evidence, share, refresh, and revoke", async ({
  page,
  request,
}) => {
  const appBaseUrl = String(test.info().project.use.baseURL);
  const projectTitle = `E2E 맥락 프로젝트 ${Date.now()}`;
  let userId: string | undefined;

  try {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(testEmail!);
    await page.getByTestId("login-submit").click();
    await expect(
      page.getByRole("heading", { name: "로그인 링크를 보냈습니다" }),
    ).toBeVisible();

    const generated = await generateMagicLink(request, {
      redirectTo: `${appBaseUrl}/projects`,
      email: testEmail!,
    });
    userId = generated.userId;

    await page.goto(generated.actionLink);
    await expect(page).toHaveURL(/\/projects$/);
    await expect(
      page.getByRole("heading", { name: "내 프로젝트" }),
    ).toBeVisible();

    await page.getByTestId("project-create-title").fill(projectTitle);
    await page.getByTestId("project-create-submit").click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/i);
    await expect(
      page.getByRole("heading", { name: projectTitle }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "기록", exact: true }).click();
    await createSource(page, {
      kind: "meeting",
      title: "첫 기획 회의",
      content:
        "민지는 저장된 기록을 새로고침 뒤에도 확인할 수 있어야 한다고 말했다. 서준은 분석 결과에서 결정 배경과 참여자 관점을 원문 근거와 함께 보여줘야 한다고 제안했다. 팀은 공개 데모에서 로컬 분석을 기본으로 사용하기로 결정했다. 다음 회의에서는 공유 링크의 만료 기간을 어떻게 안내할지 확인해야 한다. 모든 참여자는 실패한 실행이 최근 성공 결과를 덮어쓰면 안 된다는 데 동의했다.",
    });

    await page.getByRole("tab", { name: "개요", exact: true }).click();
    await expect(page.locator('[data-testid^="analysis-source-"]')).toHaveCount(
      1,
    );
    await expect(
      page.locator('[data-testid^="analysis-source-"]').first(),
    ).toBeChecked();
    await page.getByTestId("analysis-mode-local").check();
    await page.getByTestId("analysis-submit").click();
    await expect(
      page.getByRole("heading", { name: "분석 이력", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("비교할 이전 성공 분석이 없습니다."),
    ).toBeVisible();

    const evidenceButton = page
      .getByRole("button", { name: /근거 \d+개/ })
      .first();
    await expect(evidenceButton).toBeVisible();
    await evidenceButton.click();
    await expect(page.getByRole("dialog", { name: "분석 근거" })).toBeVisible();
    await expect(
      page.getByRole("dialog").getByText("첫 기획 회의").first(),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "닫기" })
      .click();

    await page.getByRole("tab", { name: "기록", exact: true }).click();
    await createSource(page, {
      kind: "feedback",
      title: "멘토 후속 피드백",
      content:
        "유나는 멘토가 분석 이력의 변화가 한눈에 보이지 않는다고 피드백했다고 말했다. 현우는 최근 성공 결과와 바로 이전 결과만 비교하면 데모가 단순해진다고 제안했다. 팀은 새 질문과 해결된 질문을 변화 목록에 표시하기로 결정했다. 모바일에서 긴 변화 문장을 어떻게 접을지는 아직 검토해야 한다. 공유 화면에는 계정 이메일과 원문 전체를 포함하지 않기로 했다.",
    });

    await page.getByRole("tab", { name: "개요", exact: true }).click();
    const selectedSources = page.locator('[data-testid^="analysis-source-"]');
    await expect(selectedSources).toHaveCount(2);
    for (const checkbox of await selectedSources.all())
      await expect(checkbox).toBeChecked();
    await page.getByTestId("analysis-submit").click();

    await expect(
      page.getByRole("heading", { name: "최근 분석 변화" }),
    ).toBeVisible();
    await expect(
      page.getByText("비교할 이전 성공 분석이 없습니다."),
    ).toHaveCount(0);

    await page.getByRole("tab", { name: "지식맵", exact: true }).click();
    await expect(
      page.getByRole("img", { name: /프로젝트 맥락 지도/ }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "온보딩", exact: true }).click();
    await page.getByTestId("share-create").click();
    const shareUrlInput = page.getByLabel("새 공유 링크");
    await expect(shareUrlInput).toBeVisible();
    const shareUrl = await shareUrlInput.inputValue();
    expect(shareUrl).toMatch(/\/share#token=.+/);

    const sharedPage = await page.context().newPage();
    await sharedPage.goto(shareUrl);
    await expect(
      sharedPage.getByRole("heading", { name: projectTitle }),
    ).toBeVisible();
    await expect(
      sharedPage.getByText(
        "원문 전체나 계정 정보를 포함하지 않는 공유용 분석 화면입니다.",
      ),
    ).toBeVisible();
    await expect(
      sharedPage.getByText(testEmail!, { exact: false }),
    ).toHaveCount(0);
    await sharedPage.reload();
    await expect(
      sharedPage.getByRole("heading", { name: projectTitle }),
    ).toBeVisible();

    const revokeButton = page.locator('[data-testid^="share-revoke-"]').first();
    await revokeButton.click();
    await expect(page.getByText("폐기됨", { exact: true })).toBeVisible();
    await sharedPage.reload();
    await expect(
      sharedPage.getByRole("heading", { name: "공유 내용을 열 수 없습니다" }),
    ).toBeVisible();
  } finally {
    if (userId) await deleteTestUser(request, userId);
  }
});

async function createSource(
  page: Page,
  source: {
    kind: "meeting" | "research" | "feedback" | "note";
    title: string;
    content: string;
  },
) {
  await page.getByTestId("source-create-kind").selectOption(source.kind);
  await page.getByTestId("source-create-title").fill(source.title);
  await page.getByTestId("source-create-content").fill(source.content);
  await page.getByTestId("source-create-submit").click();
  await expect(page.getByRole("heading", { name: source.title })).toBeVisible();
}

async function generateMagicLink(
  request: APIRequestContext,
  options: { email: string; redirectTo: string },
) {
  const response = await request.post(
    `${supabaseUrl}/auth/v1/admin/generate_link`,
    {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      data: {
        type: "magiclink",
        email: options.email,
        redirect_to: options.redirectTo,
      },
    },
  );
  expect(
    response.ok(),
    "Supabase should generate the test Magic Link",
  ).toBeTruthy();

  const body = (await response.json()) as {
    action_link?: string;
    properties?: { action_link?: string; actionLink?: string };
    user?: { id?: string };
  };
  const actionLink =
    body.action_link ??
    body.properties?.action_link ??
    body.properties?.actionLink;
  expect(
    actionLink,
    "Supabase generate_link response should contain an action link",
  ).toBeTruthy();
  expect(
    body.user?.id,
    "Supabase generate_link response should contain a user id",
  ).toBeTruthy();
  return { actionLink: actionLink!, userId: body.user!.id! };
}

async function deleteTestUser(request: APIRequestContext, userId: string) {
  const response = await request.delete(
    `${supabaseUrl}/auth/v1/admin/users/${userId}`,
    {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  expect(
    response.ok(),
    "Supabase should delete the disposable E2E user",
  ).toBeTruthy();
}
