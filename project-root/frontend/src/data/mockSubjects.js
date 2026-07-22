// data/mockSubjects.js
// backend/src/db/schema.sql의 lecture + lecture_time 테이블 구조를 그대로 반영한 mock 데이터.
// times는 실제로는 lecture_time에 (day, start_time, end_time) 단위 row로 나뉘어 저장되지만,
// 프론트에서 다루기 편하게 강의 하나당 배열로 묶어서 표현했다. start/end는 "HH:MM" 문자열.
// tier는 강의평 기반 등급(성적 관대함)의 mock 값 (1~3, 높을수록 우호적).
// grade는 개설 학년("1"~"4") 또는 학년 무관("*"). 학교 API의 estblGrade 값 형식을 그대로 따름.
export const mockSubjects = [
  {
    id: "m1", year: 2026, semester: "2026-1", name: "자료구조", professor: "김민준",
    credit: 3, category: "전공필수", department: "컴퓨터공학과",
    required: true, prerequisite: null, pair_group: null, tier: 2, grade: "2",
    times: [{ day: "월", start: "09:00", end: "10:30" }, { day: "수", start: "09:00", end: "10:30" }],
  },
  {
    id: "m2", year: 2026, semester: "2026-1", name: "운영체제", professor: "이서연",
    credit: 3, category: "전공필수", department: "컴퓨터공학과",
    required: true, prerequisite: null, pair_group: null, tier: 1, grade: "2",
    times: [{ day: "화", start: "09:00", end: "10:30" }, { day: "목", start: "09:00", end: "10:30" }],
  },
  {
    id: "m3", year: 2026, semester: "2026-1", name: "알고리즘", professor: "박지훈",
    credit: 3, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: ["m1"], pair_group: null, tier: 2, grade: "3",
    times: [{ day: "월", start: "10:30", end: "12:00" }, { day: "수", start: "10:30", end: "12:00" }],
  },
  {
    id: "m4", year: 2026, semester: "2026-1", name: "데이터베이스", professor: "최유나",
    credit: 3, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: null, pair_group: null, tier: 3, grade: "3",
    times: [{ day: "화", start: "10:30", end: "12:00" }, { day: "목", start: "10:30", end: "12:00" }],
  },
  {
    id: "m5a", year: 2026, semester: "2026-1", name: "네트워크이론", professor: "정하늘",
    credit: 2, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: null, pair_group: "net", tier: 2, grade: "3",
    times: [{ day: "금", start: "09:00", end: "10:30" }],
  },
  {
    id: "m5b", year: 2026, semester: "2026-1", name: "네트워크실습", professor: "정하늘",
    credit: 1, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: null, pair_group: "net", tier: 2, grade: "3",
    times: [{ day: "금", start: "10:30", end: "12:00" }],
  },
  {
    id: "m6", year: 2026, semester: "2026-1", name: "소프트웨어공학", professor: "한도윤",
    credit: 3, category: "전공선택", department: "컴퓨터공학과",
    required: false, prerequisite: null, pair_group: null, tier: 3, grade: "4",
    times: [{ day: "월", start: "13:30", end: "15:00" }, { day: "수", start: "13:30", end: "15:00" }],
  },
  {
    id: "g1", year: 2026, semester: "2026-1", name: "글쓰기와표현", professor: "오세훈",
    credit: 2, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 2, grade: "*",
    times: [{ day: "화", start: "13:30", end: "15:00" }],
  },
  {
    id: "g2", year: 2026, semester: "2026-1", name: "심리학의이해", professor: "윤소희",
    credit: 3, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 1, grade: "*",
    times: [{ day: "월", start: "15:00", end: "16:30" }, { day: "수", start: "15:00", end: "16:30" }],
  },
  {
    id: "g3", year: 2026, semester: "2026-1", name: "영어회화", professor: "Smith",
    credit: 2, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 3, grade: "*",
    times: [{ day: "목", start: "13:30", end: "15:00" }],
  },
  {
    id: "g4", year: 2026, semester: "2026-1", name: "경제학원론", professor: "장우진",
    credit: 3, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 2, grade: "*",
    times: [{ day: "화", start: "15:00", end: "16:30" }, { day: "목", start: "15:00", end: "16:30" }],
  },
  {
    id: "g5", year: 2026, semester: "2026-1", name: "미술의이해", professor: "백서아",
    credit: 2, category: "교양", department: "교양학부",
    required: false, prerequisite: null, pair_group: null, tier: 1, grade: "*",
    times: [{ day: "금", start: "13:30", end: "15:00" }],
  },
];
