const { calculateCreditSummary } = require('./creditSummary');

const TARGETS = { totalCredits: 130, majorCredits: 51, generalCredits: 30 };
const course = (credits, category) => ({ credits, category });

describe('calculateCreditSummary - 경계값', () => {
  test('정확히 충족: 현재치가 목표와 같으면 gap 0', () => {
    const result = calculateCreditSummary(
      TARGETS,
      [],
      [
        course(51, '전공'),
        course(30, '교양'),
        course(49, '일반선택X'), // major/general 어디에도 안 잡히지만 total엔 포함
      ]
    );

    expect(result.total).toEqual({ current: 130, required: 130, gap: 0 });
    expect(result.major).toEqual({ current: 51, required: 51, gap: 0 });
    expect(result.general).toEqual({ current: 30, required: 30, gap: 0 });
  });

  test('1학점 부족: total이 목표보다 1학점 모자라면 gap 1', () => {
    const result = calculateCreditSummary(
      TARGETS,
      [],
      [course(50, '전공'), course(30, '교양'), course(49, '기타')]
    );

    expect(result.total.gap).toBe(1);
    expect(result.major).toEqual({ current: 50, required: 51, gap: 1 });
  });

  test('초과 이수: 목표보다 많이 들어도 gap은 음수가 아니라 0', () => {
    const result = calculateCreditSummary(TARGETS, [], [course(60, '전공'), course(35, '교양')]);

    expect(result.major).toEqual({ current: 60, required: 51, gap: 0 });
    expect(result.general).toEqual({ current: 35, required: 30, gap: 0 });
  });
});

describe('calculateCreditSummary - 카테고리 분류', () => {
  test('전공필수/전공은 둘 다 major로 집계된다', () => {
    const result = calculateCreditSummary(TARGETS, [], [course(3, '전공필수'), course(3, '전공')]);
    expect(result.major.current).toBe(6);
  });

  test('교양/일반선택은 둘 다 general로 집계된다', () => {
    const result = calculateCreditSummary(TARGETS, [], [course(3, '교양'), course(3, '일반선택')]);
    expect(result.general.current).toBe(6);
  });

  test('creditSummary는 category만 보므로, category가 없는 임의 문자열이면 total에만 잡힌다', () => {
    const result = calculateCreditSummary(TARGETS, [], [course(3, '기타')]);
    expect(result.total.current).toBe(3);
    expect(result.major.current).toBe(0);
    expect(result.general.current).toBe(0);
  });

  test('이중 태깅: 전공이면서 창업교과목 specialTag가 붙은 과목(IT기술경영개론)도 category="전공" 덕분에 전공 학점 집계에 정상 반영된다', () => {
    // normalizeCourse.js가 specialTags를 category에 덮어쓰지 않게 고친 뒤로,
    // 이런 과목도 category는 원본 그대로 "전공"이라 creditSummary(=major/general 집계)에서
    // 빠지지 않는다. specialTags는 gradRequirements.js(트랙 특수요건 판정)에서만 쓰인다.
    const itTechManagement = { credits: 3, category: '전공', specialTags: ['창업교과목'] };

    const result = calculateCreditSummary(TARGETS, [], [itTechManagement]);

    expect(result.major.current).toBe(3);
    expect(result.total.current).toBe(3);
  });
});

describe('calculateCreditSummary - completedCourses + basketCourses 합산', () => {
  test('이미 이수한 과목과 이번 학기 담은 과목이 함께 합산된다', () => {
    const completedCourses = [course(20, '전공'), course(10, '교양')];
    const basketCourses = [course(3, '전공'), course(3, '교양')];

    const result = calculateCreditSummary(TARGETS, completedCourses, basketCourses);

    expect(result.major.current).toBe(23);
    expect(result.general.current).toBe(13);
    expect(result.total.current).toBe(36);
  });

  test('completedCourses/basketCourses를 생략하면 빈 배열로 취급되어 전부 부족 상태로 계산된다', () => {
    const result = calculateCreditSummary(TARGETS);

    expect(result.total).toEqual({ current: 0, required: 130, gap: 130 });
    expect(result.major).toEqual({ current: 0, required: 51, gap: 51 });
    expect(result.general).toEqual({ current: 0, required: 30, gap: 30 });
  });
});
