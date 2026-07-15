// data/mockSubjects.js
// backend/src/db/schema.sql의 lecture + lecture_time 테이블 구조를 그대로 반영한 mock 데이터.
// times는 실제로는 lecture_time에 (day, period) 단위 row로 나뉘어 저장되지만,
// 프론트에서 다루기 편하게 강의 하나당 배열로 묶어서 표현했다.
// 1교시=90분이므로, 3학점 강의는 "주 2회 × 1교시"로 나눠 배치했다.
// tier는 강의평 기반 등급(성적 관대함)의 mock 값 (1~3, 높을수록 우호적).
export const mockSubjects = [
  {
    id: "m1", year: 2026, semester: "2026-1", name: "자료구조", professor: "김민준",
    credit: 3, category: "전공필수", department: "컴퓨터공학과",
    required: true, prerequisite: null, pair_group: null, tier: 2,
    times: [{ day: "월", period: 1 }, { day: "수", period: 1 }],
  },
  {
    id: "m2", year: 2026, semester: "2026-1", name: "운영체제", professor: "이서연",
    credit: 3, category: "전공필수", department: "컴퓨터공학과",
    required: true, prerequisite: null, pair_group: null, tier: 1,
    times: [{ day: "화", period: 1 }, { day: "목", period: 1 }],
  },
  {
    id: "m3", year: 2026, semester: "2026-1", name: "알고리즘", professor: "박지훈",
    credit: 3, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: ["m1"], pair_group: null, tier: 2,
    times: [{ day: "월", period: 2 }, { day: "수", period: 2 }],
  },
  {
    id: "m4", year: 2026, semester: "2026-1", name: "데이터베이스", professor: "최유나",
    credit: 3, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: null, pair_group: null, tier: 3,
    times: [{ day: "화", period: 2 }, { day: "목", period: 2 }],
  },
  {
    id: "m5a", year: 2026, semester: "2026-1", name: "네트워크이론", professor: "정하늘",
    credit: 2, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: null, pair_group: "net", tier: 2,
    times: [{ day: "금", period: 1 }],
  },
  {
    id: "m5b", year: 2026, semester: "2026-1", name: "네트워크실습", professor: "정하늘",
    credit: 1, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: null, pair_group: "net", tier: 2,
    times: [{ day: "금", period: 2 }],
  },
  {
    id: "m6", year: 2026, semester: "2026-1", name: "소프트웨어공학", professor: "한도윤",
    credit: 3, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: null, pair_group: null, tier: 3,
    times: [{ day: "월", period: 3 }, { day: "수", period: 3 }],
  },
  {
    id: "g1", year: 2026, semester: "2026-1", name: "글쓰기와표현", professor: "오세훈",
    credit: 2, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 2,
    times: [{ day: "화", period: 3 }],
  },
  {
    id: "g2", year: 2026, semester: "2026-1", name: "심리학의이해", professor: "윤소희",
    credit: 3, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 1,
    times: [{ day: "월", period: 4 }, { day: "수", period: 4 }],
  },
  {
    id: "g3", year: 2026, semester: "2026-1", name: "영어회화", professor: "Smith",
    credit: 2, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 3,
    times: [{ day: "목", period: 3 }],
  },
  {
    id: "g4", year: 2026, semester: "2026-1", name: "경제학원론", professor: "장우진",
    credit: 3, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 2,
    times: [{ day: "화", period: 4 }, { day: "목", period: 4 }],
  },
  {
    id: "g5", year: 2026, semester: "2026-1", name: "미술의이해", professor: "백서아",
    credit: 2, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 1,
    times: [{ day: "금", period: 3 }],
  },
];
