import { test, before } from "node:test";
import assert from "node:assert/strict";

// database.js 는 import 되는 순간 DB_PATH 를 읽어 파일을 연다.
// ESM 의 import 는 최상단으로 끌어올려져 먼저 실행되므로, 여기서 process.env 를 그냥 대입하면
// 이미 늦다(실제 server/data/app.db 를 열어버린다). 그래서 환경변수를 먼저 세우고
// 동적 import 로 불러온다.
process.env.DB_PATH = ":memory:";

let createSubject;
let completeSubject;
let uncompleteSubject;
let listSubjects;

before(async () => {
  const service = await import("./subjectService.js");
  ({ createSubject, completeSubject, uncompleteSubject, listSubjects } = service);
});

function makeSubject(name = "테스트과목") {
  return createSubject({
    name,
    examDate: "2026-08-10",
    understanding: 4,
    difficulty: 0,
    gradeWeight: null,
    grading: 0,
    studyAmount: 4,
    availableTime: 0,
    credits: null,
    previousScore: null,
  });
}

test("completeSubject: 완료하면 completedAt 이 채워진다", () => {
  const subject = makeSubject("완료대상");
  const done = completeSubject(subject.id);

  assert.notEqual(done.completedAt, null);
  assert.equal(done.id, subject.id);
});

test("completeSubject: 완료하면 활성 목록에서 빠진다", () => {
  const subject = makeSubject("활성에서빠짐");
  completeSubject(subject.id);

  const activeNames = listSubjects("active").map((s) => s.name);
  assert.equal(activeNames.includes("활성에서빠짐"), false);
});

test("uncompleteSubject: 완료를 풀면 completedAt 이 null 이 된다", () => {
  const subject = makeSubject("되돌리기대상");
  completeSubject(subject.id);

  const restored = uncompleteSubject(subject.id);
  assert.equal(restored.completedAt, null);
});

test("uncompleteSubject: 완료를 풀면 활성 목록에 다시 나타난다", () => {
  const subject = makeSubject("다시활성");
  completeSubject(subject.id);
  uncompleteSubject(subject.id);

  const activeNames = listSubjects("active").map((s) => s.name);
  assert.equal(activeNames.includes("다시활성"), true);
});

// 없는 id 를 주면 404 로 답할 수 있도록 null 을 돌려줘야 한다.
test("uncompleteSubject: 없는 id 면 null", () => {
  assert.equal(uncompleteSubject(999999), null);
});

test("completeSubject: 없는 id 면 null", () => {
  assert.equal(completeSubject(999999), null);
});

// 완료가 아닌 과목에 풀기를 걸어도 깨지지 않아야 한다(이미 활성이니 그대로 활성).
test("uncompleteSubject: 완료가 아닌 과목에 걸어도 활성 그대로", () => {
  const subject = makeSubject("원래활성");
  const result = uncompleteSubject(subject.id);

  assert.equal(result.completedAt, null);
});

// 이 테스트가 실제 DB 파일을 건드리면 개발용 데이터가 오염된다.
// (실제로 한 번 겪었다. import 순서 때문에 메모리 DB 설정이 늦게 걸렸다.)
test("테스트는 메모리 DB 에서만 돈다", () => {
  assert.equal(process.env.DB_PATH, ":memory:");
});
