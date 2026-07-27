const { calculateSemesterPlan } = require('./semesterPlan');

describe('calculateSemesterPlan', () => {
  test('정상 계산: "2-2", total 85학점 남음 → remainingSemesters=5, total.needed=17', () => {
    const result = calculateSemesterPlan({
      currentSemester: '2-2',
      combinedTotal: 45, // 130 - 45 = 85
      combinedMajor: 20,
      combinedGeneral: 10,
      goalTotal: 130,
      goalMajor: 51,
      goalGeneral: 30,
    });

    expect(result.error).toBeNull();
    expect(result.remainingSemesters).toBe(5);
    expect(result.perSemester.total.needed).toBe(17);
  });

  test('딱 나누어떨어짐: "3-1", total 60학점 남음, 남은학기 4 → total.needed=15', () => {
    const result = calculateSemesterPlan({
      currentSemester: '3-1',
      combinedTotal: 40, // 100 - 40 = 60
      combinedMajor: 20,
      combinedGeneral: 10,
      goalTotal: 100,
      goalMajor: 51,
      goalGeneral: 30,
    });

    expect(result.error).toBeNull();
    expect(result.remainingSemesters).toBe(4);
    expect(result.perSemester.total.needed).toBe(15);
  });

  test('이미 목표 달성: "4-2", total 0학점 남음 → total.needed=0', () => {
    const result = calculateSemesterPlan({
      currentSemester: '4-2',
      combinedTotal: 130,
      combinedMajor: 51,
      combinedGeneral: 30,
      goalTotal: 130,
      goalMajor: 51,
      goalGeneral: 30,
    });

    expect(result.error).toBeNull();
    expect(result.remainingSemesters).toBe(1);
    expect(result.perSemester.total.needed).toBe(0);
    expect(result.perSemester.total.warning).toBe(false);
  });

  test('마지막 학기(4-2)인데 아직 22학점 남음 → total.needed=22, warning=true', () => {
    const result = calculateSemesterPlan({
      currentSemester: '4-2',
      combinedTotal: 108, // 130 - 108 = 22
      combinedMajor: 51,
      combinedGeneral: 30,
      goalTotal: 130,
      goalMajor: 51,
      goalGeneral: 30,
    });

    expect(result.error).toBeNull();
    expect(result.remainingSemesters).toBe(1);
    expect(result.perSemester.total.needed).toBe(22);
    expect(result.perSemester.total.warning).toBe(true);
  });

  test('잘못된 학기 문자열: "5-1" → error 메시지 반환, perSemester는 전부 0', () => {
    const result = calculateSemesterPlan({
      currentSemester: '5-1',
      combinedTotal: 0,
      combinedMajor: 0,
      combinedGeneral: 0,
      goalTotal: 130,
      goalMajor: 51,
      goalGeneral: 30,
    });

    expect(result.error).toBe(
      'currentSemester는 "1-1"~"4-2" 형식이어야 합니다: 5-1'
    );
    expect(result.remainingSemesters).toBe(0);
    expect(result.perSemester).toEqual({
      total: { needed: 0, warning: false },
      major: { needed: 0, warning: false },
      general: { needed: 0, warning: false },
      other: { needed: 0 },
    });
  });

  test('전공/교양 외 자유이수(other) 계산: "2-2" → other.needed 정확히 계산', () => {
    // other 목표 = goalTotal - goalMajor - goalGeneral = 130 - 51 - 30 = 49
    // remainingSemesters = 5 → ceil(49 / 5) = 10
    const result = calculateSemesterPlan({
      currentSemester: '2-2',
      combinedTotal: 45,
      combinedMajor: 20,
      combinedGeneral: 10,
      goalTotal: 130,
      goalMajor: 51,
      goalGeneral: 30,
    });

    expect(result.error).toBeNull();
    expect(result.remainingSemesters).toBe(5);
    expect(result.perSemester.other.needed).toBe(10);
  });
});
