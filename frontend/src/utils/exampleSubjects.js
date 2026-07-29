// node:test 로 직접 돌리는 모듈이라 확장자를 붙인다. (Vite 와 달리 Node 는 생략을 못 푼다)
import { SCALE_MIDDLE, UNKNOWN } from "./scaleLabels.js";

// 처음 온 사람이 "뭘 넣어야 하지"에서 막히지 않게 넣어주는 예시다.
// 세 과목의 성격을 일부러 다르게 뒀다. 우선순위가 왜 갈리는지 결과 화면에서 바로 보이게 하려는 것이다.
//
// - 임박하고 어렵고 잘 모르는 과목  → 1순위로 올라간다
// - 보통인 과목                     → 가운데
// - 멀고 쉽고 이미 잘하는 과목      → 아래로 내려간다
//
// 날짜는 오늘로부터 며칠 뒤인지로 둔다. 고정 날짜를 적으면 시간이 지나 전부 "지난 시험"이 된다.
const EXAMPLE_TEMPLATES = [
  {
    name: "한방병리학",
    daysFromToday: 2,
    understanding: 2,
    difficulty: 6,
    gradeWeight: 100,
    grading: 6,
    studyAmount: 6,
    availableTime: 3,
    credits: 3,
    previousScore: null,
  },
  {
    name: "해부학",
    daysFromToday: 9,
    understanding: SCALE_MIDDLE,
    difficulty: 5,
    gradeWeight: 60,
    grading: SCALE_MIDDLE,
    studyAmount: SCALE_MIDDLE,
    availableTime: SCALE_MIDDLE,
    credits: 3,
    previousScore: null,
  },
  {
    name: "의학용어",
    daysFromToday: 21,
    understanding: 6,
    difficulty: 2,
    gradeWeight: 30,
    grading: UNKNOWN,
    studyAmount: 2,
    availableTime: 6,
    credits: 2,
    previousScore: 88,
  },
];

function toExamDate(daysFromToday, today = new Date()) {
  const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysFromToday);
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  return `${target.getFullYear()}-${month}-${day}`;
}

export function buildExampleSubjects(today = new Date()) {
  return EXAMPLE_TEMPLATES.map(({ daysFromToday, ...rest }) => ({
    ...rest,
    examDate: toExamDate(daysFromToday, today),
  }));
}

export const EXAMPLE_SUBJECTS = EXAMPLE_TEMPLATES;
