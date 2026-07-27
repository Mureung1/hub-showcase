import { evaluateTrackRequirements } from './gradRequirements';

// completedCourses 항목 형태: { name, credits, specialTags }
// specialTags 배열에 majorData.js 요건의 label과 일치하는 문자열이 있어야 해당 요건
// 학점으로 집계된다 (category와는 무관 — 이중 태깅 테스트는 아래 별도로 확인).
const course = (name, credits, label) => ({ name, credits, specialTags: [label] });

describe('evaluateTrackRequirements - multi-major (다중전공 트랙)', () => {
  const TRACK = 'multi-major';

  describe('다중전공 이수 (binary)', () => {
    test('미충족: 이수 기록 없음', () => {
      const result = evaluateTrackRequirements([], TRACK);
      expect(result['다중전공 이수']).toEqual({
        satisfied: false,
        current: 0,
        required: 1,
      });
    });

    test('정확히충족: 1건 이수', () => {
      const completed = [course('다중전공 인정과목', 3, '다중전공 이수')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['다중전공 이수']).toEqual({
        satisfied: true,
        current: 3,
        required: 1,
      });
    });
  });

  describe('창업교과목 (15학점)', () => {
    test('미충족: 10학점 이수', () => {
      const completed = [course('창업입문', 10, '창업교과목')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['창업교과목']).toEqual({
        satisfied: false,
        current: 10,
        required: 15,
      });
    });

    test('정확히충족: 15학점 이수', () => {
      const completed = [course('창업입문', 15, '창업교과목')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['창업교과목']).toEqual({
        satisfied: true,
        current: 15,
        required: 15,
      });
    });
  });

  describe('종합설계교과목 (3학점)', () => {
    test('1학점부족: 2학점 이수', () => {
      const completed = [course('종합설계프로젝트', 2, '종합설계교과목')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['종합설계교과목']).toEqual({
        satisfied: false,
        current: 2,
        required: 3,
      });
    });

    test('정확히충족: 3학점 이수', () => {
      const completed = [course('종합설계프로젝트', 3, '종합설계교과목')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['종합설계교과목']).toEqual({
        satisfied: true,
        current: 3,
        required: 3,
      });
    });
  });
});

describe('evaluateTrackRequirements - overseas-dual-degree (해외복수학위 트랙)', () => {
  const TRACK = 'overseas-dual-degree';

  describe('창업교과목 (3학점)', () => {
    test('1학점부족: 2학점 이수', () => {
      const completed = [course('창업입문', 2, '창업교과목')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['창업교과목']).toEqual({
        satisfied: false,
        current: 2,
        required: 3,
      });
    });

    test('정확히충족: 3학점 이수', () => {
      const completed = [course('창업입문', 3, '창업교과목')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['창업교과목']).toEqual({
        satisfied: true,
        current: 3,
        required: 3,
      });
    });
  });
});

describe('evaluateTrackRequirements - 이중 태깅 (전공이면서 창업교과목인 과목)', () => {
  const TRACK = 'overseas-dual-degree';

  // App.jsx가 완전한 course 객체(category + specialTags 모두 있음)를 그대로
  // completedCourses에 실어 보내는 실제 상황을 재현한다.
  test('category가 "전공"이어도 specialTags에 창업교과목이 있으면 창업교과목 요건에 집계된다', () => {
    const itTechManagement = {
      name: 'IT기술경영개론',
      credits: 3,
      category: '전공',
      specialTags: ['창업교과목'],
    };

    const result = evaluateTrackRequirements([itTechManagement], TRACK);

    expect(result['창업교과목']).toEqual({
      satisfied: true, // 해외복수학위 트랙은 3학점 요건이라 3학점이면 충족
      current: 3,
      required: 3,
    });
  });
});

describe('evaluateTrackRequirements - 예외 처리', () => {
  test('존재하지 않는 트랙을 넘기면 에러를 던진다', () => {
    expect(() => evaluateTrackRequirements([], 'not-a-real-track')).toThrow(
      '존재하지 않는 트랙입니다: not-a-real-track'
    );
  });

  test('completedCourses를 생략해도 빈 배열로 처리한다', () => {
    const result = evaluateTrackRequirements(undefined, 'multi-major');
    expect(result['현장실습']).toEqual({
      satisfied: false,
      current: 0,
      required: 3,
    });
  });
});
