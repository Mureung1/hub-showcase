// 할일 등록 폼과 그 데이터를 재사용하는 다른 lib/컴포넌트(microtaskTemplates.js,
// ReasonCheckpoint.jsx 등)가 공유하는 content-as-data 상수.
// RegisterPage.jsx 안에 있던 것을 옮겨왔다 — lib 모듈이 특정 페이지 컴포넌트를
// import하는 역참조 구조를 없애기 위함.

// 유형 9종 — select의 옵션으로 매핑할 것이므로 컴포넌트 밖 상수로 둔다.
export const TYPE_OPTIONS = [
  "리포트/글쓰기",
  "문제풀이/암기",
  "발표/PT 준비",
  "코딩 실습",
  "시험공부",
  "프로젝트",
  "조별과제",
  "개인공부",
  "기타",
];

// 회피 이유 4종 — value는 DB/로직에서 쓸 영문 키, label은 화면에 보여줄 한글 문구.
// { value, label } 형태로 두면 <option value={value}>{label}</option>로 바로 매핑 가능.
export const REASON_OPTIONS = [
  { value: "overwhelm", label: "막막해서 못 시작" },
  { value: "dislike", label: "이 할일 자체가 하기 싫음" },
  { value: "temptation", label: "눈앞의 유혹(놀고 싶음)" },
  { value: "custom", label: "기타(직접입력)" },
];
