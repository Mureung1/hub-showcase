// server/src/data/normalizeCourse.js
// 학교에서 받은 원본 학사 데이터(raw/*.csv)의 같은 과목 분반 행들을
// 앱이 쓰는 과목 형태({ id, name, credits, category, ... })로 변환한다.
//
// 원본은 분반(강좌 번호 뒤의 "-001" 등)마다 행이 따로 있어서, 같은 과목이라도
// 여러 줄로 나뉘어 있다. 화면엔 과목 하나만 카드로 보여줘야 하므로 분반 번호를
// 뗀 baseCode 단위로 여러 행을 하나로 묶고, 분반별 정보(시간·강의실·교수)는
// sections 배열에 보존한다.
//
// 원본의 "교과구분" 컬럼은 파일에 따라 항상 "전공" 또는 "교양"으로만 찍혀 있어서,
// 앱이 졸업요건 판정에 쓰는 전공필수/종합설계교과목/창업교과목 같은 세부 구분은
// 원본 데이터만으로 알 수 없다. 그 정보는 학과 교육과정표를 보고
// categoryOverrides.js에 baseCode 단위로 직접 채워 넣어야 한다.
//
// category와 specialTags는 서로 다른 목적의 별개 필드다:
// - category: 원본 "교과구분"(전공/교양) 그대로. 총학점/전공/교양 집계(creditSummary.js)에 쓰인다.
// - specialTags: categoryOverrides에 등록된 트랙 특수 라벨(창업교과목, 종합설계교과목 등)을
//   "추가"로 담는 배열. 트랙 특수요건 판정(gradRequirements.js)에 쓰인다.
// 창업교과목/종합설계교과목은 원래 전공 또는 교양으로도 분류된 과목이라(이중 태깅),
// specialTags를 category에 덮어써서는 안 된다 — 덮어쓰면 그 과목이 전공/교양 집계에서
// 통째로 빠지는 버그가 생긴다 (과거에 실제로 있었던 문제).

/**
 * @param {string} code - 원본 "강좌 번호" (예: 'COME0311-004')
 * @returns {string} 분반 번호를 뗀 과목 단위 코드 (예: 'COME0311')
 */
function getBaseCode(code) {
  return code.split('-')[0];
}

/**
 * @param {Object[]} rows - 같은 과목(baseCode)의 분반 행들. 헤더 키는 공백이 제거된
 *   형태여야 한다 (예: '강좌번호', '교과목명', '학점', '교과구분', '학년', '시간', '강의실', '교수명').
 * @param {Object.<string, string>} categoryOverrides - baseCode → 트랙 특수 라벨(specialTag)
 * @returns {{ id: string, name: string, credits: number, category: string, specialTags: string[],
 *             grade: number, department: string,
 *             sections: Array<{ code: string, schedule: string, location: string, professor: string|null }> }}
 */
function normalizeCourse(rows, categoryOverrides = {}) {
  const [first] = rows;
  const baseCode = getBaseCode(first['강좌번호']);
  const specialTag = categoryOverrides[baseCode];

  return {
    id: baseCode,
    name: first['교과목명'],
    credits: Number(first['학점']),
    category: first['교과구분'],
    specialTags: specialTag ? [specialTag] : [],
    grade: Number(first['학년']),
    department: first['개설학과'],
    sections: rows.map((row) => ({
      code: row['강좌번호'],
      schedule: row['시간'].replace(/\n/g, ' '),
      location: row['강의실'],
      professor: row['교수명'] || null,
    })),
  };
}

module.exports = { normalizeCourse, getBaseCode };
