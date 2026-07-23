import { buildGapList } from './gapList';

describe('buildGapList', () => {
  // ---- 정상 케이스 ----

  test('모든 항목 부족 + 제외 대상 아닌 배지 전부 미이수 → 6개 메시지 전부 포함', () => {
    const result = buildGapList({
      goalTotal: 130,
      combinedTotal: 100, // 30학점 부족
      goalMajor: 51,
      combinedMajor: 40, // 11학점 부족
      goalGeneral: 30,
      combinedGeneral: 20, // 10학점 부족
      badges: [
        { label: '다중전공', done: false },
        { label: '현장실습', done: false },
        { label: '해외학점', done: false },
        { label: '창업교과목', done: false },
        { label: '종합설계', done: false },
      ],
    });

    expect(result).toEqual([
      '총학점 30학점 부족',
      '전공 11학점 부족',
      '교양 10학점 부족',
      '현장실습 미이수',
      '창업교과목 미이수',
      '종합설계 미이수',
    ]);
  });

  test('일부만 부족: 총학점만 gap > 0 → 총학점 메시지만 포함', () => {
    const result = buildGapList({
      goalTotal: 130,
      combinedTotal: 100,
      goalMajor: 51,
      combinedMajor: 51,
      goalGeneral: 30,
      combinedGeneral: 30,
      badges: [
        { label: '다중전공', done: true },
        { label: '현장실습', done: true },
        { label: '해외학점', done: true },
        { label: '창업교과목', done: true },
        { label: '종합설계', done: true },
      ],
    });

    expect(result).toEqual(['총학점 30학점 부족']);
  });

  test('배지 일부만 미이수: 현장실습만 false → 현장실습 미이수만 포함', () => {
    const result = buildGapList({
      goalTotal: 130,
      combinedTotal: 130,
      goalMajor: 51,
      combinedMajor: 51,
      goalGeneral: 30,
      combinedGeneral: 30,
      badges: [
        { label: '다중전공', done: true },
        { label: '현장실습', done: false },
        { label: '해외학점', done: true },
        { label: '창업교과목', done: true },
        { label: '종합설계', done: true },
      ],
    });

    expect(result).toEqual(['현장실습 미이수']);
  });

  test('다중전공/해외학점은 미이수여도 gapList에서 제외된다', () => {
    const result = buildGapList({
      goalTotal: 130,
      combinedTotal: 130,
      goalMajor: 51,
      combinedMajor: 51,
      goalGeneral: 30,
      combinedGeneral: 30,
      badges: [
        { label: '다중전공', done: false },
        { label: '현장실습', done: true },
        { label: '해외학점', done: false },
        { label: '창업교과목', done: true },
        { label: '종합설계', done: true },
      ],
    });

    expect(result).toEqual(['모든 요건을 충족했어요 🎉']);
  });

  // ---- 경계값 ----

  test('gap = 0이면 해당 항목 메시지는 push되지 않는다', () => {
    const result = buildGapList({
      goalTotal: 130,
      combinedTotal: 100, // 부족
      goalMajor: 51,
      combinedMajor: 51, // gap = 0
      goalGeneral: 30,
      combinedGeneral: 30, // gap = 0
      badges: [
        { label: '다중전공', done: true },
        { label: '현장실습', done: true },
        { label: '해외학점', done: true },
        { label: '창업교과목', done: true },
        { label: '종합설계', done: true },
      ],
    });

    expect(result).not.toContain(expect.stringContaining('전공'));
    expect(result).not.toContain(expect.stringContaining('교양'));
    expect(result).toEqual(['총학점 30학점 부족']);
  });

  test('gap = 1 (최소 부족 단위)이면 정확히 1학점 부족으로 표시된다', () => {
    const result = buildGapList({
      goalTotal: 101,
      combinedTotal: 100,
      goalMajor: 51,
      combinedMajor: 51,
      goalGeneral: 30,
      combinedGeneral: 30,
      badges: [
        { label: '다중전공', done: true },
        { label: '현장실습', done: true },
        { label: '해외학점', done: true },
        { label: '창업교과목', done: true },
        { label: '종합설계', done: true },
      ],
    });

    expect(result).toEqual(['총학점 1학점 부족']);
  });

  test('gap이 음수(초과 이수)면 메시지가 push되지 않는다', () => {
    const result = buildGapList({
      goalTotal: 100,
      combinedTotal: 120, // 20학점 초과
      goalMajor: 51,
      combinedMajor: 51,
      goalGeneral: 30,
      combinedGeneral: 30,
      badges: [
        { label: '다중전공', done: true },
        { label: '현장실습', done: true },
        { label: '해외학점', done: true },
        { label: '창업교과목', done: true },
        { label: '종합설계', done: true },
      ],
    });

    expect(result).toEqual(['모든 요건을 충족했어요 🎉']);
  });

  test('모든 조건 완전 충족 → fallback 축하 메시지만 반환된다', () => {
    const result = buildGapList({
      goalTotal: 130,
      combinedTotal: 130,
      goalMajor: 51,
      combinedMajor: 51,
      goalGeneral: 30,
      combinedGeneral: 30,
      badges: [
        { label: '다중전공', done: true },
        { label: '현장실습', done: true },
        { label: '해외학점', done: true },
        { label: '창업교과목', done: true },
        { label: '종합설계', done: true },
      ],
    });

    expect(result).toEqual(['모든 요건을 충족했어요 🎉']);
  });

  test('badges가 빈 배열이어도 학점 gap 로직은 정상 동작한다', () => {
    const result = buildGapList({
      goalTotal: 130,
      combinedTotal: 100,
      goalMajor: 51,
      combinedMajor: 51,
      goalGeneral: 30,
      combinedGeneral: 30,
      badges: [],
    });

    expect(result).toEqual(['총학점 30학점 부족']);
  });

  // ---- 실패/예외 케이스 (현재 로직의 방어 부재를 드러내는 케이스) ----

  test('goalTotal/combinedTotal이 undefined면 gap이 NaN이 되어 조용히 무시된다', () => {
    const result = buildGapList({
      goalTotal: undefined,
      combinedTotal: undefined,
      goalMajor: 51,
      combinedMajor: 51,
      goalGeneral: 30,
      combinedGeneral: 30,
      badges: [
        { label: '다중전공', done: true },
        { label: '현장실습', done: true },
        { label: '해외학점', done: true },
        { label: '창업교과목', done: true },
        { label: '종합설계', done: true },
      ],
    });

    // NaN > 0 은 false이므로 경고 없이 통과된다 (의도한 동작인지 재검토 필요)
    expect(result).toEqual(['모든 요건을 충족했어요 🎉']);
  });

  test('badge에 label이 없으면 "undefined 미이수"라는 메시지가 만들어진다', () => {
    const result = buildGapList({
      goalTotal: 100,
      combinedTotal: 100,
      goalMajor: 51,
      combinedMajor: 51,
      goalGeneral: 30,
      combinedGeneral: 30,
      badges: [{ done: false }],
    });

    expect(result).toEqual(['undefined 미이수']);
  });

  test('badges 자체가 없으면 TypeError가 발생한다', () => {
    expect(() =>
      buildGapList({
        goalTotal: 100,
        combinedTotal: 100,
        goalMajor: 51,
        combinedMajor: 51,
        goalGeneral: 30,
        combinedGeneral: 30,
      })
    ).toThrow(TypeError);
  });
});
