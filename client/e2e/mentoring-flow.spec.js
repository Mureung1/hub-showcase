import { test, expect } from '@playwright/test';

// 재실행해도 이전 실행 데이터와 충돌하지 않도록 매 실행마다 고유한 이메일/키워드를 쓴다.
const runId = Date.now();
const LAB_KEYWORD = `E2E테스트연구실-${runId}`;

const menteeCredentials = {
  email: `mentee-${runId}@e2e.test`,
  password: 'password123',
  name: '테스트멘티',
  school: '서울대학교',
  major: '컴퓨터공학',
  grade: '2',
  enrollmentStatus: 'enrolled',
};

const mentorSignupPayload = (index) => ({
  email: `mentor${index}-${runId}@e2e.test`,
  password: 'password123',
  name: `이멘토${index}`,
  school: '서울대학교',
  major: '컴퓨터공학',
  academicStatus: '박사과정',
  program: '정규 멘토링',
  lab: LAB_KEYWORD,
  introduction: `E2E 테스트용 멘토${index}입니다.`,
  detailedIntroduction: '딥러닝과 자연어처리를 연구합니다.',
  availableTime: '평일 저녁',
  researchFields: ['머신러닝', '딥러닝', '자연어처리'],
  counselingFields: ['진로상담'],
  careerHighlights: ['논문 게재'],
  internationalActivities: ['국제 학회 발표'],
});

test.describe.serial('멘티-멘토 면담 신청 전체 흐름', () => {
  /** @type {import('@playwright/test').Page} */
  let menteePage;
  /** @type {import('@playwright/test').Page} */
  let mentorPage;
  /** @type {Array<{ id: string } & ReturnType<typeof mentorSignupPayload>>} */
  const mentors = [];

  test.beforeAll(async ({ browser, request }) => {
    // 요청받은 10단계는 "멘토 로그인"부터 시작하고 멘토 회원가입은 포함하지 않으므로,
    // 선택할 멘토 3명을 API로 미리 만들어 둔다.
    for (let index = 1; index <= 3; index += 1) {
      const payload = mentorSignupPayload(index);
      const response = await request.post('http://localhost:4000/api/auth/signup/mentor', {
        data: payload,
      });
      expect(response.ok(), `멘토${index} 시드 회원가입 실패: ${await response.text()}`).toBeTruthy();
      const body = await response.json();
      mentors.push({ ...payload, id: body.data.user.id });
    }

    menteePage = await (await browser.newContext()).newPage();
    mentorPage = await (await browser.newContext()).newPage();
  });

  test.afterAll(async () => {
    await menteePage.context().close();
    await mentorPage.context().close();
  });

  test('1. 멘티 회원가입', async () => {
    await menteePage.goto('/signup');
    await menteePage.getByRole('link', { name: '멘티로 가입하기' }).click();
    await menteePage.waitForURL('**/signup/mentee');

    await menteePage.locator('input[name="name"]').fill(menteeCredentials.name);
    await menteePage.locator('input[name="password"]').fill(menteeCredentials.password);
    await menteePage.locator('input[name="email"]').fill(menteeCredentials.email);
    await menteePage.locator('input[name="school"]').fill(menteeCredentials.school);
    await menteePage.locator('input[name="major"]').fill(menteeCredentials.major);
    await menteePage.locator('select[name="grade"]').selectOption(menteeCredentials.grade);
    await menteePage
      .locator('select[name="enrollmentStatus"]')
      .selectOption(menteeCredentials.enrollmentStatus);

    await menteePage.getByRole('button', { name: '가입하기' }).click();

    await expect(menteePage.getByText('멘티 가입이 완료되었습니다')).toBeVisible();
    // 가입 완료 1.8초 뒤 자동으로 로그인 화면(/#login)으로 이동한다.
    await menteePage.waitForURL('**/#login');
  });

  test('2. 멘티 로그인', async () => {
    await menteePage.locator('#login input[name="email"]').fill(menteeCredentials.email);
    await menteePage.locator('#login input[name="password"]').fill(menteeCredentials.password);
    await menteePage.locator('#login button[type="submit"]').click();

    await menteePage.waitForURL('**/mentee/mentors');
  });

  test('3. 멘토 목록 조회', async () => {
    await menteePage.locator('input[name="query"]').fill(LAB_KEYWORD);
    await menteePage.getByRole('button', { name: '검색 실행' }).click();

    for (const mentor of mentors) {
      await expect(menteePage.locator(`#mentor-card-${mentor.id}`)).toBeVisible();
    }
  });

  test('4. 멘토 상세 조회', async () => {
    const [firstMentor] = mentors;
    await menteePage.locator(`#mentor-card-${firstMentor.id} a.mentor-detail-button`).click();

    await menteePage.waitForURL(`**/mentee/mentors/${firstMentor.id}`);
    await expect(menteePage.getByRole('heading', { name: firstMentor.name })).toBeVisible();
    await expect(menteePage.getByText(firstMentor.lab)).toBeVisible();

    await menteePage.getByRole('link', { name: '멘토 목록으로 돌아가기' }).click();
    await menteePage.waitForURL('**/mentee/mentors');

    // 상세 화면에 다녀오면 목록 페이지가 새로 마운트되며 검색 필터가 초기화되므로 다시 검색한다.
    await menteePage.locator('input[name="query"]').fill(LAB_KEYWORD);
    await menteePage.getByRole('button', { name: '검색 실행' }).click();
  });

  test('5. 최대 3명 선택', async () => {
    for (const mentor of mentors) {
      // 실제 checkbox(input)는 CSS로 숨겨져 있고 그 위에 장식용 mentor-check-icon이 덮여
      // 있어서 input을 직접 .check()하면 아이콘이 클릭을 가로채 타임아웃난다. 실제 사용자처럼
      // <label>을 클릭하면 브라우저가 연결된 checkbox를 자동으로 토글해준다.
      await menteePage.locator(`#mentor-card-${mentor.id} label.mentor-select-control`).click();
      await expect(
        menteePage.locator(`#mentor-card-${mentor.id} input.mentor-select-input`),
      ).toBeChecked();
    }

    await expect(menteePage.locator('.selected-mentor-list .selected-mentor-link')).toHaveCount(3);
  });

  test('6. 사전 질문지 작성 및 제출', async () => {
    await menteePage.getByRole('button', { name: '면담 신청' }).click();
    await menteePage.waitForURL('**/mentee/applications/new');

    await expect(menteePage.locator('.questionnaire-mentors .tag')).toHaveCount(3);

    await menteePage
      .getByPlaceholder('학년, 전공, 관심 분야를 간단히 적어주세요.')
      .fill('E2E 테스트 자기소개입니다.');
    await menteePage
      .getByPlaceholder('진로, 연구실, 전공 수업, 대학원 준비 중 가장 궁금한 점을 적어주세요.')
      .fill('E2E 테스트 고민입니다.');
    await menteePage
      .getByPlaceholder('면담 후 어떤 판단이나 정보를 얻고 싶은지 적어주세요.')
      .fill('E2E 테스트 목표입니다.');
    await menteePage.getByPlaceholder('예: 화요일 19:00, 금요일 15:00').fill('화요일 19:00');

    await menteePage.getByRole('button', { name: '면담 신청 제출' }).click();

    await menteePage.waitForURL(/\/mentee\/applications\/.+\/complete/);
    await expect(
      menteePage.getByRole('heading', { name: '면담 신청이 완료되었습니다.' }),
    ).toBeVisible();
  });

  test('7. 멘토 로그인', async () => {
    const [firstMentor] = mentors;
    await mentorPage.goto('/');
    await mentorPage.locator('#login input[name="email"]').fill(firstMentor.email);
    await mentorPage.locator('#login input[name="password"]').fill(firstMentor.password);
    await mentorPage.locator('#login button[type="submit"]').click();

    await mentorPage.waitForURL('**/mentor/home');
  });

  test('8. 멘토 신청 목록 조회', async () => {
    await expect(mentorPage.getByText(`${menteeCredentials.name} 멘티`)).toBeVisible();
  });

  test('9. 신청 수락', async () => {
    await mentorPage.getByRole('button', { name: '수락' }).click();

    await expect(mentorPage.getByRole('button', { name: /확정/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(mentorPage.locator('.mentor-application-status', { hasText: '확정' })).toBeVisible();
  });

  test('10. 멘티 신청 상태 확인', async () => {
    const [firstMentor] = mentors;
    await menteePage.goto('/mentee/mypage/applications');
    await menteePage.getByRole('tab', { name: /확정/ }).click();

    await expect(menteePage.getByRole('heading', { name: '면담을 수락한 멘토' })).toBeVisible();
    await expect(menteePage.getByRole('link', { name: `${firstMentor.name} 멘토` })).toBeVisible();
  });
});
