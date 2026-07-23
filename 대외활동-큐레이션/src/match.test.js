// matchActivity()의 테스트. 이 함수는 이 서비스의 심장(공고 하나를 프로필과 대조해 판정)인데 테스트가
// 없었다. 이미 도는 함수라 이건 주로 회귀 테스트(동작 고정)지만, 경계 케이스를 찔러 실제 버그가 있으면
// 잡는 목적도 겸한다. 규칙은 match.js 주석 참고. (프론트라 vitest로 돌린다: npm test)
import { test, expect } from "vitest";
import { matchActivity } from "./match.js";

// eligibility 기본틀(전부 무관). 각 테스트에서 필요한 필드만 덮어쓴다.
const base = { grades: [], majors: [], regions: [], enrollment: [], incomeMax: null, gpaMin: null };
const activity = (elig, parseStatus = "curated") => ({ parseStatus, eligibility: { ...base, ...elig } });

test("어긋난 조건 없으면 eligible", () => {
  const r = matchActivity(activity({ grades: [3] }), { grade: 3 });
  expect(r.status).toBe("eligible");
  expect(r.failed).toEqual([]);
});

test("parseStatus가 needs_review면 판정 안 하고 review", () => {
  const r = matchActivity(activity({ grades: [1] }, "needs_review"), { grade: 3 });
  expect(r.status).toBe("review");
});

test("공고 조건이 무관([])이면 통과", () => {
  const r = matchActivity(activity({ grades: [] }), { grade: 3 });
  expect(r.status).toBe("eligible");
});

test("프로필에서 미선택(null)인 조건은 계산에서 제외", () => {
  const r = matchActivity(activity({ grades: [1] }), { grade: null });
  expect(r.status).toBe("eligible");
});

test("학년만 1급간 차이면 거의 가능(near)", () => {
  const r = matchActivity(activity({ grades: [3] }), { grade: 2 });
  expect(r.status).toBe("near");
  expect(r.failed[0].label).toBe("학년");
});

test("학년이 2급간 이상 차이면 지원 불가(ineligible)", () => {
  const r = matchActivity(activity({ grades: [4] }), { grade: 2 });
  expect(r.status).toBe("ineligible");
});

test("전공 하나만 어긋나면 거의 가능(학년 아닌 조건도 1개 차이는 near)", () => {
  const r = matchActivity(activity({ majors: ["IT"] }), { major: "경영" });
  expect(r.status).toBe("near");
});

test("두 조건 이상 어긋나면 지원 불가", () => {
  const r = matchActivity(activity({ majors: ["IT"], regions: ["서울"] }), { major: "경영", region: "부산" });
  expect(r.status).toBe("ineligible");
  expect(r.failed.length).toBe(2);
});

test("소득분위: 경계값(정확히 상한)은 통과(이하)", () => {
  const r = matchActivity(activity({ incomeMax: 8 }), { income: 8 });
  expect(r.status).toBe("eligible");
});

test("학점: 경계값(정확히 하한)은 통과(이상)", () => {
  const r = matchActivity(activity({ gpaMin: 3.5 }), { gpa: 3.5 });
  expect(r.status).toBe("eligible");
});

test("소득분위: 상한 초과면 어긋남", () => {
  const r = matchActivity(activity({ incomeMax: 8 }), { income: 9 });
  expect(r.status).toBe("near");
});

test("학점: 하한 미만이면 어긋남", () => {
  const r = matchActivity(activity({ gpaMin: 3.5 }), { gpa: 3.2 });
  expect(r.status).toBe("near");
});

// 경계 케이스: eligibility가 통째로 null인 공고(수집기 이상). 터지지 않고 확인 필요로 가야 한다.
test("eligibility가 null이면 터지지 않고 review", () => {
  const bad = { parseStatus: "curated", eligibility: null };
  let r;
  expect(() => { r = matchActivity(bad, { grade: 3 }); }).not.toThrow();
  expect(r.status).toBe("review");
  expect(r.failed).toEqual([]);
});

// 경계 케이스: eligibility는 객체인데 배열 필드 하나가 null(수집기가 필드 하나만 빠뜨린 경우).
test("eligibility 배열 필드 하나가 null이어도 터지지 않는다", () => {
  const partial = { parseStatus: "curated", eligibility: { ...base, grades: null } };
  expect(() => matchActivity(partial, { grade: 3 })).not.toThrow();
});
