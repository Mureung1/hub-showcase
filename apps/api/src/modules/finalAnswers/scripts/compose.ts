import "dotenv/config";
import type {
  Agenda,
  AgendaResolutionReason,
  AgendaStatus,
  AiProvider,
  SourceAnswer,
} from "@decision-log/shared";

import {
  decideGenerationMode,
  isAgendaSetSettled,
  succeededProviders,
} from "../pipeline/generationMode.js";
import { buildFallbackNote } from "../pipeline/fallbackNote.js";

/**
 * 개발 전용 검증 스크립트 (SPEC-AI-003 H-2).
 * **DB에 쓰지 않는다.** `--mode-test`는 LLM 호출 0회로 결정론적으로 돈다.
 *
 *   npm run final:compose -- --mode-test
 */

// ---------------------------------------------------------------------------
// 테스트 재료 — 계약을 만족하는 최소 Agenda·SourceAnswer
// ---------------------------------------------------------------------------

const NOW = "2026-07-31T00:00:00.000Z";

function agenda(
  status: AgendaStatus,
  resolutionReason: AgendaResolutionReason | null,
  title: string,
): Agenda {
  const resolved = status === "passed" || status === "rejected";
  return {
    id: `00000000-0000-4000-8000-${String(title.length).padStart(12, "0")}`,
    questionId: "11111111-1111-4111-8111-111111111111",
    status,
    resolutionReason,
    kind: resolutionReason === "auto_single_source" ? "single_source" : "consensus",
    title,
    summary: `${title} 요약`,
    selectedContent: status === "passed" ? `${title}의 확정 내용이다.` : null,
    selectedSourceRef:
      status === "passed"
        ? { sourceAnswerId: "22222222-2222-4222-8222-222222222222", sectionId: "s1" }
        : resolved
          ? "NO_VALUE"
          : null,
    userNote: null,
    stances: [],
    sourceRefs: [],
    disagreementType: null,
    revisedType: null,
    confidence: null,
    displayOrder: 0,
    recheckRequest: null,
    recheckResult: null,
    recheckRequestedAt: null,
    reansweredAt: null,
    resolvedAt: resolved ? NOW : null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function answer(
  provider: AiProvider,
  opts: { status?: SourceAnswer["status"]; excluded?: boolean } = {},
): SourceAnswer {
  const status = opts.status ?? "succeeded";
  const ok = status === "succeeded";
  return {
    id: `33333333-3333-4333-8333-${provider.padEnd(12, "0")}`,
    questionId: "11111111-1111-4111-8111-111111111111",
    provider,
    status,
    model: "test-model",
    structuredContent: ok
      ? { summary: "요약", sections: [{ sectionId: "s1", title: "t", content: "c", order: 0, kind: "point" }] }
      : null,
    responseMeta: null,
    errorCode: ok ? null : "PROVIDER_TIMEOUT",
    errorMessage: null,
    retryCount: 0,
    excludedFromComparison: opts.excluded ?? false,
    excludedAt: opts.excluded ? NOW : null,
    startedAt: NOW,
    completedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

// ---------------------------------------------------------------------------
// §4 모드 판정 + §2.1 확정 판정 (LLM 0회)
// ---------------------------------------------------------------------------

function modeTest(): void {
  const cases: {
    name: string;
    agendas: Agenda[];
    answers: SourceAnswer[];
    expect: string;
    check: () => boolean;
  }[] = [];

  const push = (
    name: string,
    agendas: Agenda[],
    answers: SourceAnswer[],
    expect: string,
    check: (r: ReturnType<typeof decideGenerationMode>) => boolean,
  ): void => {
    cases.push({
      name,
      agendas,
      answers,
      expect,
      check: () => check(decideGenerationMode({ agendas, sourceAnswers: answers })),
    });
  };

  const three = [answer("claude"), answer("openai"), answer("gemini")];
  const onlyClaude = [
    answer("claude"),
    answer("openai", { status: "failed" }),
    answer("gemini", { status: "failed" }),
  ];

  push(
    "3사 성공 + passed 있음 → multi_source",
    [agenda("passed", "auto_consensus", "쟁점A"), agenda("rejected", "user_rejected", "쟁점B")],
    three,
    "multi_source · 제외 provider 없음",
    (r) => r.mode === "multi_source" && r.excludedProviders.length === 0 && r.passedCount === 1,
  );

  push(
    "단일 provider 성공 + passed 있음 → single_source_fallback",
    [agenda("passed", "auto_single_source", "쟁점A")],
    onlyClaude,
    "single_source_fallback · 제외 openai·gemini",
    (r) =>
      r.mode === "single_source_fallback" &&
      r.excludedProviders.join(",") === "openai,gemini",
  );

  push(
    "⭐ 전부 rejected → all_agendas_rejected (판단 순서: provider 수보다 먼저)",
    [agenda("rejected", "user_rejected", "쟁점A"), agenda("rejected", "user_rejected", "쟁점B")],
    three,
    "all_agendas_rejected · AI 미호출",
    (r) => r.mode === "all_agendas_rejected" && r.passedCount === 0 && r.rejectedCount === 2,
  );

  push(
    "⭐ 단일 provider + 전부 rejected → all_agendas_rejected 가 이긴다",
    [agenda("rejected", "user_rejected", "쟁점A")],
    onlyClaude,
    "순서를 뒤집으면 single_source_fallback 으로 잘못 분류돼 AI를 부른다",
    (r) => r.mode === "all_agendas_rejected",
  );

  push(
    "⭐ 2개 성공 → multi_source (§5.3: '정확히 하나'만 fallback)",
    [agenda("passed", "auto_consensus", "쟁점A")],
    [answer("claude"), answer("openai"), answer("gemini", { status: "failed" })],
    "multi_source",
    (r) => r.mode === "multi_source",
  );

  push(
    "⭐ 제외된 provider 는 성공으로 세지 않는다",
    [agenda("passed", "auto_single_source", "쟁점A")],
    [
      answer("claude"),
      answer("openai", { excluded: true }),
      answer("gemini", { status: "failed" }),
    ],
    "single_source_fallback — excludedFromComparison 은 기여하지 않았다",
    (r) => r.mode === "single_source_fallback",
  );

  console.log("=== §4 generation_mode 판정 (LLM 호출 0회) ===\n");
  let passed = 0;
  for (const c of cases) {
    const ok = c.check();
    if (ok) passed += 1;
    const r = decideGenerationMode({ agendas: c.agendas, sourceAnswers: c.answers });
    console.log(`${ok ? "✅ PASS" : "❌ FAIL"}  ${c.name}`);
    console.log(`         기대: ${c.expect}`);
    console.log(
      `         결과: ${r.mode} · passed ${r.passedCount} · rejected ${r.rejectedCount} · 제외 [${r.excludedProviders.join(", ")}]`,
    );
  }

  // §2.1 확정 판정 — 조건을 흩어놓지 않기 위해 한 함수로 둔 것
  console.log("\n=== §2.1 Agenda 집합 확정 판정 ===\n");
  const settleCases: { name: string; agendas: Agenda[]; expect: boolean }[] = [
    { name: "전부 passed", agendas: [agenda("passed", "auto_consensus", "A")], expect: true },
    {
      name: "passed + rejected 혼합",
      agendas: [agenda("passed", "auto_consensus", "A"), agenda("rejected", "user_rejected", "B")],
      expect: true,
    },
    {
      name: "conflicted 남음 → 아직 아니다",
      agendas: [agenda("passed", "auto_consensus", "A"), agenda("conflicted", null, "B")],
      expect: false,
    },
    { name: "draft 남음 → 아직 아니다", agendas: [agenda("draft", null, "A")], expect: false },
    {
      name: "⭐ 0건 → 확정 아님 (Manager 완전 실패는 §2.5가 처리한다)",
      agendas: [],
      expect: false,
    },
  ];
  for (const c of settleCases) {
    const actual = isAgendaSetSettled(c.agendas);
    const ok = actual === c.expect;
    if (ok) passed += 1;
    console.log(`${ok ? "✅ PASS" : "❌ FAIL"}  ${c.name} → ${actual}`);
  }

  const total = cases.length + settleCases.length;
  console.log(`\n→ ${passed}/${total} 통과`);
  console.log(
    `\n(참고) succeededProviders 3사 전부 성공 = [${succeededProviders(three).join(", ")}]`,
  );
  if (passed !== total) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// §5.2 대체 노트 — 출력을 직접 주입한다(LLM 0회)
// ---------------------------------------------------------------------------

/**
 * ⚠️ `?_PROMPT_VERSION=nonexistent` 주입으로는 이 경로를 못 탄다.
 * 그건 **프롬프트 로드 실패**라 FinalAnswer 까지 같이 죽는다. §5.2가 요구하는 것은
 * "FinalAnswer 는 성공했는데 decisionNote 만 빈 문자열" 같은 **파싱·검증 단계 실패**다.
 * 그래서 대체 노트 생성 함수에 재료를 직접 넣어 검증한다.
 */
function fallbackNoteTest(): void {
  console.log("\n=== §5.2 대체 DecisionNote (LLM 호출 0회) ===\n");

  // ⚠️ 제목에 "합의"·"일치" 같은 검사 대상 단어를 넣지 않는다 — 그러면 정규식이 제목을
  // 잡아 **코드가 덧붙인 문구인지 원래 제목인지 구분하지 못한다**. 검사하려는 것은
  // "대체 노트가 판단 주체를 덧붙이는가"이지 특정 단어의 등장 여부가 아니다.
  const agendas = [
    agenda("passed", "auto_consensus", "배포 방식"),
    agenda("passed", "auto_single_source", "모니터링 도구"),
    agenda("passed", "user_accepted", "인증 방식"),
    agenda("rejected", "user_rejected", "캐시 전략"),
  ];
  const note = buildFallbackNote({
    questionMessage: "어떤 방식을 골라야 할까요?",
    agendas,
  });

  console.log("--- 생성된 대체 노트 ---");
  console.log(note);
  console.log("------------------------\n");

  const checks: { name: string; ok: boolean; why: string }[] = [
    {
      name: "질문이 첫 줄에 있다",
      ok: note.startsWith("어떤 방식을 골라야 할까요?"),
      why: "무엇에 대한 결정인지가 먼저 와야 한다",
    },
    {
      name: "passed 3건이 결정 사항에 들어간다",
      ok:
        note.includes("배포 방식") &&
        note.includes("모니터링 도구") &&
        note.includes("인증 방식"),
      why: "확정된 것이 빠지면 기록이 불완전하다",
    },
    {
      name: "rejected 가 제외 항목으로 분리된다",
      ok: note.includes("제외한 항목") && note.includes("캐시 전략"),
      why: "제외한 것도 결정이다",
    },
    {
      name: "⭐ 사용자 판단 문구가 없다 (§12.5)",
      ok: !/내 결정 반영|사용자 판단|합의|일치/.test(note),
      why:
        "자동 통과 항목에 '내 결정 반영'을 붙이면 노트가 사실과 달라진다(T-019.6 결함). " +
        "'합의'·'일치'도 single_source 에서 거짓이 된다",
    },
    {
      name: "제외 항목의 내용이 본문에 없다",
      ok: !note.includes("캐시 전략의 확정 내용"),
      why: "사용자가 뺀 것을 다시 넣으면 안 된다",
    },
  ];

  let passed = 0;
  for (const c of checks) {
    if (c.ok) passed += 1;
    console.log(`${c.ok ? "✅ PASS" : "❌ FAIL"}  ${c.name}`);
    if (!c.ok) console.log(`         이유: ${c.why}`);
  }
  console.log(`\n→ ${passed}/${checks.length} 통과`);
  if (passed !== checks.length) process.exitCode = 1;
}

function main(): void {
  if (process.argv.includes("--mode-test")) {
    modeTest();
    fallbackNoteTest();
    return;
  }
  console.log("사용법: npm run final:compose -- --mode-test");
}

main();
