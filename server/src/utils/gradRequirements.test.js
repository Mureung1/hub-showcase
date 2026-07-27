const { evaluateTrackRequirements } = require('./gradRequirements');

// completedCourses 항목 형태: { name, credits, specialTags }
// specialTags 배열에 majorData.js 요건의 label과 일치하는 문자열이 있어야 해당 요건
// 학점으로 집계된다 (category와는 무관 — 이중 태깅 테스트는 아래 별도로 확인).
const course = (name, credits, label) => ({ name, credits, specialTags: [label] });

describe('evaluateTrackRequirements - multi-major (다중전공 트랙)', () => {
  const TRACK = 'multi-major';

  // "다중전공 이수"는 type: 'binary' 요건이라 학점이 아니라 이수 여부(0/1)로 판정된다.
  // required가 1이라 '1학점부족' 상태는 곧 '미충족'(current 0)과 같은 상태이므로
  // 미충족 / 정확히충족(1건 이수) / 초과이수(2건 이수해도 충족 유지) 세 케이스로 검증한다.
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

    test('초과이수: 여러 건 이수해도 충족 상태 유지', () => {
      const completed = [
        course('다중전공 인정과목 A', 3, '다중전공 이수'),
        course('다중전공 인정과목 B', 3, '다중전공 이수'),
      ];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['다중전공 이수']).toEqual({
        satisfied: true,
        current: 6,
        required: 1,
      });
    });
  });

  describe('해외대학 인정학점 (9학점)', () => {
    test('미충족: 6학점만 이수 (3학점 부족)', () => {
      const completed = [course('해외대학 인정과목', 6, '해외대학 인정학점')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['해외대학 인정학점']).toEqual({
        satisfied: false,
        current: 6,
        required: 9,
      });
    });

    test('1학점부족: 8학점 이수', () => {
      const completed = [course('해외대학 인정과목', 8, '해외대학 인정학점')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['해외대학 인정학점']).toEqual({
        satisfied: false,
        current: 8,
        required: 9,
      });
    });

    test('정확히충족: 9학점 이수', () => {
      const completed = [
        course('해외대학 인정과목 A', 6, '해외대학 인정학점'),
        course('해외대학 인정과목 B', 3, '해외대학 인정학점'),
      ];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['해외대학 인정학점']).toEqual({
        satisfied: true,
        current: 9,
        required: 9,
      });
    });

    test('초과이수: 12학점 이수', () => {
      const completed = [course('해외대학 인정과목', 12, '해외대학 인정학점')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['해외대학 인정학점']).toEqual({
        satisfied: true,
        current: 12,
        required: 9,
      });
    });
  });

  describe('현장실습 (3학점)', () => {
    test('미충족: 이수 기록 없음', () => {
      const result = evaluateTrackRequirements([], TRACK);
      expect(result['현장실습']).toEqual({
        satisfied: false,
        current: 0,
        required: 3,
      });
    });

    test('1학점부족: 2학점 이수', () => {
      const completed = [course('현장실습 I', 2, '현장실습')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['현장실습']).toEqual({
        satisfied: false,
        current: 2,
        required: 3,
      });
    });

    test('정확히충족: 3학점 이수', () => {
      const completed = [course('현장실습 I', 3, '현장실습')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['현장실습']).toEqual({
        satisfied: true,
        current: 3,
        required: 3,
      });
    });

    test('초과이수: 6학점 이수', () => {
      const completed = [
        course('현장실습 I', 3, '현장실습'),
        course('현장실습 II', 3, '현장실습'),
      ];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['현장실습']).toEqual({
        satisfied: true,
        current: 6,
        required: 3,
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

    test('1학점부족: 14학점 이수', () => {
      const completed = [course('창업입문', 14, '창업교과목')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['창업교과목']).toEqual({
        satisfied: false,
        current: 14,
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

    test('초과이수: 18학점 이수', () => {
      const completed = [
        course('창업입문', 15, '창업교과목'),
        course('창업실전', 3, '창업교과목'),
      ];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['창업교과목']).toEqual({
        satisfied: true,
        current: 18,
        required: 15,
      });
    });
  });

  describe('종합설계교과목 (3학점)', () => {
    test('미충족: 이수 기록 없음', () => {
      const result = evaluateTrackRequirements([], TRACK);
      expect(result['종합설계교과목']).toEqual({
        satisfied: false,
        current: 0,
        required: 3,
      });
    });

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

    test('초과이수: 4학점 이수', () => {
      const completed = [course('종합설계프로젝트', 4, '종합설계교과목')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['종합설계교과목']).toEqual({
        satisfied: true,
        current: 4,
        required: 3,
      });
    });
  });

  test('관련 없는 과목은 어떤 요건에도 집계되지 않는다', () => {
    const completed = [course('교양선택 글쓰기', 3, '교양')];
    const result = evaluateTrackRequirements(completed, TRACK);
    Object.values(result).forEach((r) => expect(r.current).toBe(0));
  });
});

describe('evaluateTrackRequirements - 이중 태깅 (전공이면서 창업교과목인 과목)', () => {
  const TRACK = 'multi-major';

  // IT기술경영개론처럼 원본 학사 데이터상 "전공"으로 분류되어 있으면서 동시에
  // 창업교과목 트랙 특수요건에도 해당하는 과목. category는 전공/교양 집계용,
  // specialTags는 트랙 특수요건 판정용으로 서로 다른 필드라 한 과목이 둘 다 가질 수 있어야 한다.
  test('category가 "전공"이어도 specialTags에 창업교과목이 있으면 창업교과목 요건에 집계된다', () => {
    const itTechManagement = {
      name: 'IT기술경영개론',
      credits: 3,
      category: '전공',
      specialTags: ['창업교과목'],
    };

    const result = evaluateTrackRequirements([itTechManagement], TRACK);

    expect(result['창업교과목']).toEqual({
      satisfied: false, // 다중전공 트랙은 15학점 요건이라 3학점만으론 미충족
      current: 3,
      required: 15,
    });
  });
});

describe('evaluateTrackRequirements - overseas-dual-degree (해외복수학위 트랙)', () => {
  const TRACK = 'overseas-dual-degree';

  describe('해외복수학위 과정 이수 또는 교환학생 1년 이상 (binary)', () => {
    test('미충족: 이수 기록 없음', () => {
      const result = evaluateTrackRequirements([], TRACK);
      expect(result['해외복수학위 과정 이수 또는 교환학생 1년 이상']).toEqual({
        satisfied: false,
        current: 0,
        required: 1,
      });
    });

    test('정확히충족: 1건 이수', () => {
      const completed = [
        course('교환학생 1년', 1, '해외복수학위 과정 이수 또는 교환학생 1년 이상'),
      ];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['해외복수학위 과정 이수 또는 교환학생 1년 이상']).toEqual({
        satisfied: true,
        current: 1,
        required: 1,
      });
    });
  });

  describe('창업교과목 (3학점)', () => {
    test('미충족: 이수 기록 없음', () => {
      const result = evaluateTrackRequirements([], TRACK);
      expect(result['창업교과목']).toEqual({
        satisfied: false,
        current: 0,
        required: 3,
      });
    });

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

    test('초과이수: 5학점 이수', () => {
      const completed = [
        course('창업입문', 3, '창업교과목'),
        course('창업실전', 2, '창업교과목'),
      ];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['창업교과목']).toEqual({
        satisfied: true,
        current: 5,
        required: 3,
      });
    });
  });
});

describe('evaluateTrackRequirements - master-linked (학석사연계 트랙)', () => {
  const TRACK = 'master-linked';

  describe('해외대학 인정학점 (6학점)', () => {
    test('미충족: 3학점 이수', () => {
      const completed = [course('해외대학 인정과목', 3, '해외대학 인정학점')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['해외대학 인정학점']).toEqual({
        satisfied: false,
        current: 3,
        required: 6,
      });
    });

    test('1학점부족: 5학점 이수', () => {
      const completed = [course('해외대학 인정과목', 5, '해외대학 인정학점')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['해외대학 인정학점']).toEqual({
        satisfied: false,
        current: 5,
        required: 6,
      });
    });

    test('정확히충족: 6학점 이수', () => {
      const completed = [course('해외대학 인정과목', 6, '해외대학 인정학점')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['해외대학 인정학점']).toEqual({
        satisfied: true,
        current: 6,
        required: 6,
      });
    });

    test('초과이수: 9학점 이수', () => {
      const completed = [course('해외대학 인정과목', 9, '해외대학 인정학점')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['해외대학 인정학점']).toEqual({
        satisfied: true,
        current: 9,
        required: 6,
      });
    });
  });

  describe('현장실습 (3학점)', () => {
    test('미충족: 이수 기록 없음', () => {
      const result = evaluateTrackRequirements([], TRACK);
      expect(result['현장실습']).toEqual({
        satisfied: false,
        current: 0,
        required: 3,
      });
    });

    test('1학점부족: 2학점 이수', () => {
      const completed = [course('현장실습 I', 2, '현장실습')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['현장실습']).toEqual({
        satisfied: false,
        current: 2,
        required: 3,
      });
    });

    test('정확히충족: 3학점 이수', () => {
      const completed = [course('현장실습 I', 3, '현장실습')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['현장실습']).toEqual({
        satisfied: true,
        current: 3,
        required: 3,
      });
    });

    test('초과이수: 4학점 이수', () => {
      const completed = [course('현장실습 I', 4, '현장실습')];
      const result = evaluateTrackRequirements(completed, TRACK);
      expect(result['현장실습']).toEqual({
        satisfied: true,
        current: 4,
        required: 3,
      });
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
