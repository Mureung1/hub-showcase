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

function main(): void {
  if (process.argv.includes("--mode-test")) {
    modeTest();
    return;
  }
  console.log("사용법: npm run final:compose -- --mode-test");
}

main();
