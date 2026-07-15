#!/usr/bin/env node
// verify-store.mjs — 저장소(한 사이클) 재사용 검증 스크립트.
//
// 어느 컴퓨터에서든, 누구나, 몇 번이든 실행 가능하다(일회성 curl이 아님).
// 서버를 직접 켜지는 않는다 — 이미 떠 있는 백엔드(로컬이든, 다른 사람 것이든)를 검증한다.
//
// 사용법:
//   1) 다른 터미널에서 백엔드를 먼저 켠다:  npm --prefix backend run dev
//   2) 이 스크립트 실행:                    npm --prefix backend run verify
//      (또는 루트에서)                      npm run verify:backend
//   3) 다른 주소를 검증하려면:              API_BASE=http://localhost:3001 npm run verify:backend
//
// 종료 코드: 0 = 전부 통과, 1 = 실패(어느 단계인지 콘솔에 표시).
// 주의: backend가 "in-memory"면 API 계약(저장→조회→삭제)만 검증된 것이고,
//       실제 Supabase 연결까지 확인하려면 backend/.env에 SUPABASE_* 키를 넣은 뒤
//       서버를 재시작하고 다시 실행해야 한다(docs/supabase-setup.md 참고).

const BASE = process.env.API_BASE || "http://localhost:3001";
const anonId = `verify-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

let stepNum = 0;
function step(label) {
  stepNum += 1;
  process.stdout.write(`[${stepNum}] ${label} ... `);
}
function ok(detail = "") {
  console.log(`OK ${detail}`);
}
function fail(detail) {
  console.log(`FAIL — ${detail}`);
  console.log("");
  console.log(`✋ 검증 실패. 대상: ${BASE} (환경변수 API_BASE로 다른 주소 지정 가능)`);
  process.exit(1);
}

async function main() {
  console.log(`대상 서버: ${BASE}`);
  console.log(`테스트 anonId: ${anonId} (검증 후 자동 삭제됨)`);
  console.log("");

  // 1) 헬스체크 — 서버가 살아있는지 + 어떤 저장소를 쓰는지.
  step("서버 응답 확인 (GET /api/health)");
  let health;
  try {
    const res = await fetch(`${BASE}/api/health`);
    if (!res.ok) return fail(`HTTP ${res.status}`);
    health = await res.json();
  } catch (error) {
    return fail(`서버에 연결할 수 없음 — 백엔드가 켜져 있나요? (${error.message})`);
  }
  ok(`backend="${health.backend}"`);
  if (health.backend !== "supabase") {
    console.log(
      `    ⚠ 참고: 현재 저장소는 "${health.backend}"입니다. Supabase 연결까지 검증하려면` +
        " backend/.env에 SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY를 넣고 서버를 재시작한 뒤 다시 실행하세요.",
    );
  }

  // 2) 저장 (consent 없이 → 거부되어야 함).
  step("동의 없는 저장 요청이 거부되는지 확인");
  {
    const res = await fetch(`${BASE}/api/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId }),
    });
    if (res.status !== 400) return fail(`consent 없이도 저장됨(상태 ${res.status}) — 보안 문제`);
    ok("400 consent_required");
  }

  // 3) 저장 (정상 payload, task/state 필드 포함).
  step("정상 저장 (POST /api/results)");
  const payload = {
    consent: true,
    anonId,
    mbti: "INTJ",
    temperament: "NT",
    taskType: "memorize",
    deadline: "today",
    availableMinutes: 20,
    matchedMethods: ["retrieval", "spacing"],
    baselineMethods: ["spacing", "environment"],
    fitScore: 4,
    understanding: 4,
    actionability: 5,
    focus: 3,
    fatigue: 2,
    calibrationError: 1,
    algorithmVersion: "verify-script",
  };
  let saved;
  {
    const res = await fetch(`${BASE}/api/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return fail(`HTTP ${res.status} — ${await res.text()}`);
    saved = await res.json();
    if (!saved.id) return fail("응답에 id가 없음");
  }
  ok(`id=${saved.id}`);

  // 4) 조회 — 방금 저장한 값이 그대로 돌아오는지.
  step("조회 (GET /api/results?anonId=...)");
  {
    const res = await fetch(`${BASE}/api/results?anonId=${encodeURIComponent(anonId)}`);
    if (!res.ok) return fail(`HTTP ${res.status}`);
    const rows = await res.json();
    if (rows.length !== 1) return fail(`레코드 ${rows.length}개 (기대: 1)`);
    const row = rows[0];
    const mismatches = Object.entries({ taskType: "memorize", deadline: "today", availableMinutes: 20, fitScore: 4 })
      .filter(([key, expected]) => row[key] !== expected)
      .map(([key, expected]) => `${key}: got ${JSON.stringify(row[key])}, expected ${JSON.stringify(expected)}`);
    if (mismatches.length > 0) return fail(`필드 불일치 — ${mismatches.join("; ")}`);
  }
  ok("저장한 값과 일치");

  // 5) 삭제 — 삭제권.
  step("삭제 (DELETE /api/results?anonId=...)");
  {
    const res = await fetch(`${BASE}/api/results?anonId=${encodeURIComponent(anonId)}`, { method: "DELETE" });
    if (!res.ok) return fail(`HTTP ${res.status}`);
    const { removed } = await res.json();
    if (removed !== 1) return fail(`removed=${removed} (기대: 1)`);
  }
  ok("removed=1");

  // 6) 삭제 후 조회 — 비어 있어야 함.
  step("삭제 후 재조회 (빈 배열이어야 함)");
  {
    const res = await fetch(`${BASE}/api/results?anonId=${encodeURIComponent(anonId)}`);
    const rows = await res.json();
    if (rows.length !== 0) return fail(`아직 ${rows.length}개 남아있음`);
  }
  ok("빈 배열");

  console.log("");
  console.log(`✅ 전체 통과 — 저장소(${health.backend})가 화면→요청→저장→조회→삭제 한 사이클을 정상 처리합니다.`);
}

main().catch((error) => fail(error.stack || error.message));
