import "dotenv/config";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
  SourceAnswerSchema,
  type AiProvider,
  type SourceAnswer,
} from "@decision-log/shared";

import { getAdminClient } from "../../../shared/supabase/adminClient.js";
import { listByQuestion } from "../../sourceAnswers/sourceAnswers.repository.js";
import { loadEnv } from "../../../shared/config/env.js";
import { buildAgendaDrafts } from "../agendas.service.js";
import type { CompareOutput, DraftSourceRef } from "../agendas.types.js";
import { judgeDrafts } from "../pipeline/judge.js";
import {
  groundStances,
  type RejectedQuote,
} from "../pipeline/grounding.js";

/**
 * 개발 전용 검증 스크립트 — 단계 6·7 실측 (SPEC-AI-002 §I·AC5).
 * **DB에 쓰지 않는다.** 프로덕션 경로에 연결되지 않으며 읽기만 한다.
 *
 *   npm run manager:judge -- --fixture <path.json> [--runs N]
 *   npm run manager:judge -- --question <uuid> [--runs N]
 *   npm run manager:judge -- --grounding-test      (LLM 호출 0회)
 *
 * `--grounding-test`는 §11 근거 검증에 **날조한 인용을 의도적으로 주입해** 폐기되는지
 * 확인한다(AC5). 실제 판정에 쓰이는 `groundStances`를 그대로 호출하므로 검증 경로가
 * 프로덕션과 같다. LLM을 호출하지 않아 결과가 결정론적이다.
 */

const FixtureSchema = z.object({
  questionId: z.uuid(),
  questionMessage: z.string().optional(),
  sourceAnswers: z.array(SourceAnswerSchema),
});

interface Args {
  question?: string;
  fixture?: string;
  runs: number;
  groundingTest: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { runs: 1, groundingTest: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--question") out.question = argv[++i];
    else if (argv[i] === "--fixture") out.fixture = argv[++i];
    else if (argv[i] === "--runs") out.runs = Number(argv[++i]) || 1;
    else if (argv[i] === "--grounding-test") out.groundingTest = true;
  }
  return out;
}

async function loadInput(args: Args): Promise<{
  questionId: string;
  questionMessage: string;
  sourceAnswers: SourceAnswer[];
}> {
  if (args.fixture) {
    const raw = await readFile(args.fixture, "utf8");
    const parsed = FixtureSchema.parse(JSON.parse(raw));
    return {
      questionId: parsed.questionId,
      questionMessage: parsed.questionMessage ?? "(fixture 실행 — 질문 원문 없음)",
      sourceAnswers: parsed.sourceAnswers,
    };
  }
  if (args.question) {
    const admin = getAdminClient();
    const sourceAnswers = await listByQuestion(admin, args.question);
    const { data } = await admin
      .from("questions")
      .select("message")
      .eq("id", args.question)
      .maybeSingle();
    const message =
      data && typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "(질문 원문을 읽지 못함)";
    return { questionId: args.question, questionMessage: message, sourceAnswers };
  }
  throw new Error(
    "사용법: --fixture <path.json> | --question <uuid> | --grounding-test",
  );
}

function pct(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function stats(values: number[]): string {
  if (values.length === 0) return "n/a";
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const sd = Math.sqrt(
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
  );
  return `n=${values.length} 평균=${mean.toFixed(2)} 최소=${Math.min(
    ...values,
  ).toFixed(2)} 최대=${Math.max(...values).toFixed(2)} 표준편차=${sd.toFixed(3)}`;
}

// ---------------------------------------------------------------------------
// AC5 — 날조 인용 주입 (LLM 호출 0회)
// ---------------------------------------------------------------------------

function fabricationCases(): void {
  const refs: DraftSourceRef[] = [
    {
      provider: "claude",
      sourceAnswerId: "aaaaaaaa-0000-4000-8000-000000000001",
      sectionId: "claude-s1",
      title: "기본 원칙",
      content:
        "가장 중요한 원칙은 기본 거부다. 모든 테이블에 RLS를 기본 ON으로 켜라.",
    },
    {
      provider: "openai",
      sourceAnswerId: "bbbbbbbb-0000-4000-8000-000000000002",
      sectionId: "openai-s1",
      title: "설계 순서",
      content:
        "먼저 접근 주체를 정의하고 그다음 정책을 작성하는 순서를 권한다.",
    },
  ];
  const participants: AiProvider[] = ["claude", "openai"];

  const make = (
    stances: CompareOutput["stances"],
  ): CompareOutput => ({
    comparisonNote: "(테스트)",
    stances,
    disagreementType: "main_answer",
    confidence: 0.5,
  });

  const cases: {
    name: string;
    output: CompareOutput;
    expect: string;
    check: (r: ReturnType<typeof groundStances>) => boolean;
  }[] = [
    {
      name: "정상 인용 (대조군)",
      output: make([
        { provider: "claude", quotes: ["가장 중요한 원칙은 기본 거부다."], text: "기본 거부" },
        { provider: "openai", quotes: ["먼저 접근 주체를 정의하고"], text: "주체 먼저" },
      ]),
      expect: "stance 2개 유지, 폐기 0",
      check: (r) => r.stances.length === 2 && r.quotesRejected === 0,
    },
    {
      name: "원문에 없는 문장 주입",
      output: make([
        {
          provider: "claude",
          quotes: ["RLS는 사실 필요 없으며 꺼두는 편이 낫다."],
          text: "날조",
        },
        { provider: "openai", quotes: ["먼저 접근 주체를 정의하고"], text: "주체 먼저" },
      ]),
      expect: "날조 quote 폐기 → claude stance 폐기, openai만 남음",
      check: (r) =>
        r.quotesRejected === 1 &&
        r.stances.length === 1 &&
        r.stances[0]?.provider === "openai",
    },
    {
      name: "다른 provider 섹션의 문장 주입",
      output: make([
        {
          provider: "claude",
          // openai 원문에 실제로 있는 문장이지만 claude stance에 넣었다.
          quotes: ["먼저 접근 주체를 정의하고"],
          text: "타 provider 인용",
        },
        { provider: "openai", quotes: ["먼저 접근 주체를 정의하고"], text: "주체 먼저" },
      ]),
      expect: "타 provider 인용 폐기 → claude stance 폐기",
      check: (r) =>
        r.quotesRejected === 1 &&
        r.stances.length === 1 &&
        r.stances[0]?.provider === "openai",
    },
    {
      name: "부분 날조 (단어 추가)",
      output: make([
        {
          provider: "claude",
          // 원문은 "기본 거부다" — "절대"를 끼워 넣었다.
          quotes: ["가장 중요한 원칙은 절대 기본 거부다."],
          text: "단어 추가",
        },
        { provider: "openai", quotes: ["먼저 접근 주체를 정의하고"], text: "주체 먼저" },
      ]),
      expect: "단어가 추가된 인용은 거부",
      check: (r) => r.quotesRejected === 1 && r.stances.length === 1,
    },
    {
      name: "공백만 다른 인용 (허용되어야 함)",
      output: make([
        {
          provider: "claude",
          quotes: ["가장   중요한 원칙은\n기본 거부다."],
          text: "공백 정규화",
        },
        { provider: "openai", quotes: ["먼저 접근 주체를 정의하고"], text: "주체 먼저" },
      ]),
      expect: "공백 정규화 후 통과 → 폐기 0",
      check: (r) => r.quotesRejected === 0 && r.stances.length === 2,
    },
    {
      name: "quotes 전부 날조 → stance 폐기",
      output: make([
        { provider: "claude", quotes: ["없는 문장 A", "없는 문장 B"], text: "전부 날조" },
        { provider: "openai", quotes: ["먼저 접근 주체를 정의하고"], text: "주체 먼저" },
      ]),
      expect: "quotes 0개가 된 stance 폐기",
      check: (r) => r.quotesRejected === 2 && r.stances.length === 1,
    },
    {
      name: "모든 stance 날조 → 쟁점 폐기 신호(stances 0개)",
      output: make([
        { provider: "claude", quotes: ["없는 문장 A"], text: "날조" },
        { provider: "openai", quotes: ["없는 문장 B"], text: "날조" },
      ]),
      expect: "stances 0개 → judge.ts가 쟁점을 폐기한다(§11-4)",
      check: (r) => r.stances.length === 0,
    },
    {
      name: "참여하지 않은 provider의 stance",
      output: make([
        { provider: "gemini", quotes: ["가장 중요한 원칙은 기본 거부다."], text: "미참여" },
        { provider: "openai", quotes: ["먼저 접근 주체를 정의하고"], text: "주체 먼저" },
      ]),
      expect: "참여자가 아니면 stance 통째 폐기",
      check: (r) =>
        r.stances.length === 1 && r.stances[0]?.provider === "openai",
    },

    // --- T-019.3.1 A-4 · 지표 공백 재현 -----------------------------------
    // `quoteRejectRate` 0%인데 쟁점이 폐기되는 조합을 결정론적으로 재현한다.
    // 이것이 T-019.3에서 관측된 agendaDropRate 33.3%의 유력 원인 경로다.
    {
      name: "⭐ quotes 빈 배열 1개 (스키마 허용) — empty_quotes 로 잡혀야",
      output: make([
        { provider: "claude", quotes: [], text: "인용을 못 뽑음" },
        { provider: "openai", quotes: ["먼저 접근 주체를 정의하고"], text: "주체 먼저" },
      ]),
      expect: "quote 폐기 0인데 claude stance 소멸 → empty_quotes=1 로 관측",
      check: (r) =>
        r.quotesRejected === 0 &&
        r.stances.length === 1 &&
        r.stancesDiscarded.empty_quotes === 1,
    },
    {
      name: "⭐ 전 stance quotes 빈 배열 → 쟁점 폐기 (quoteRejectRate 0%)",
      output: make([
        { provider: "claude", quotes: [], text: "빈 인용" },
        { provider: "openai", quotes: [], text: "빈 인용" },
      ]),
      expect: "quotesTotal 0·폐기 0인데 stances 0개 → 쟁점 폐기. empty_quotes=2",
      check: (r) =>
        r.quotesTotal === 0 &&
        r.quotesRejected === 0 &&
        r.stances.length === 0 &&
        r.stancesDiscarded.empty_quotes === 2,
    },
    {
      name: "stances 자체가 빈 배열 → empty_output (empty_quotes 와 구분)",
      output: make([]),
      expect: "empty_output=1, empty_quotes=0 — 두 사유가 섞이지 않아야",
      check: (r) =>
        r.stances.length === 0 &&
        r.stancesDiscarded.empty_output === 1 &&
        r.stancesDiscarded.empty_quotes === 0,
    },
    {
      name: "인용은 냈지만 전부 날조 → empty_quotes 가 아니어야 (오귀인 방지)",
      output: make([
        { provider: "claude", quotes: ["없는 문장 A"], text: "날조" },
        { provider: "openai", quotes: ["먼저 접근 주체를 정의하고"], text: "주체 먼저" },
      ]),
      expect: "quotesRejected=1 로 이미 보이므로 empty_quotes=0",
      check: (r) =>
        r.quotesRejected === 1 && r.stancesDiscarded.empty_quotes === 0,
    },
  ];

  console.log("=== AC5 · 근거 검증 날조 주입 테스트 (LLM 호출 0회) ===\n");
  let passed = 0;
  for (const testCase of cases) {
    const result = groundStances(testCase.output, refs, participants);
    const ok = testCase.check(result);
    if (ok) passed += 1;
    console.log(`${ok ? "✅ PASS" : "❌ FAIL"}  ${testCase.name}`);
    console.log(`         기대: ${testCase.expect}`);
    const discarded = Object.entries(result.stancesDiscarded)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.log(
      `         결과: stance ${result.stances.length}개 [${result.stances
        .map((s) => s.provider)
        .join(", ")}] / quote ${result.quotesRejected}/${result.quotesTotal} 폐기` +
        `${discarded ? ` / stance폐기 ${discarded}` : ""}`,
    );
  }
  console.log(`\n→ ${passed}/${cases.length} 통과`);
  if (passed !== cases.length) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// T-019.3.1 B-2 — 정당한 인용이 폐기되는가 (false positive 탐색, LLM 0회)
// ---------------------------------------------------------------------------

/**
 * §11의 `normalized`는 **공백만** 정규화한다. 원문에 마크다운 기호나 유니코드
 * 변형이 있으면 **원문에서 그대로 잘라낸 정당한 인용**도 부분 문자열 매칭에 실패한다.
 *
 * 이 함수는 그 경계를 문자 종류별로 갈라 보여준다. 통과/실패 여부가 아니라
 * **어느 문자 차이가 정당한 근거를 죽이는지**를 지목하는 것이 목적이다.
 * 정규화 규칙은 고치지 않는다 — 설계 판단이 필요하다(사용자).
 */
function falsePositiveProbe(): void {
  console.log("\n\n=== B-2 · 정당한 인용의 false positive 탐색 (LLM 호출 0회) ===\n");
  console.log("원문에 실제로 있는 문장을 모델이 자연스럽게 다듬어 인용했을 때를 재현한다.\n");

  const probes: { kind: string; content: string; quote: string; why: string }[] = [
    {
      // ⭐ T-019.3.1 B-1 에서 실제로 관측된 폐기 사례를 그대로 재현한다.
      // three-providers fixture · openai-s3 · quoteRejectRate 8.3% 회차.
      kind: "⭐조사 와→과 (실관측)",
      content:
        "익명 사용자(anon)와 인증 사용자(authenticated) 역할을 구분해 정책을 작성해야 의도치 않은 공개를 막을 수 있다. 역할별로 필요한 최소 권한만 여는 것을 기본으로 하라.",
      quote:
        "익명 사용자(anon)과 인증 사용자(authenticated) 역할을 구분해 정책을 작성해야 의도치 않은 공개를 막을 수 있다.",
      why: "원문 '와' → 인용 '과'. 내용 동일, 한 글자 차이",
    },
    {
      kind: "어미 변형",
      content: "정책은 SQL 파일로 관리하되 역할별로 나눠 정의하는 것을 권장한다.",
      quote: "정책은 SQL 파일로 관리하되 역할별로 나눠 정의하는 것을 권장합니다.",
      why: "'권장한다' → '권장합니다'. 존댓말 변환",
    },
    {
      kind: "마크다운 불릿",
      content: "- 첫째, 정책은 SQL 파일로 관리한다.\n- 둘째, 이름에 목적을 담는다.",
      quote: "첫째, 정책은 SQL 파일로 관리한다.",
      why: "인용에서 선행 `- `를 뗐다",
    },
    {
      kind: "강조 표기 **",
      content: "**핵심은** RLS를 기본 ON으로 켜는 것이다.",
      quote: "핵심은 RLS를 기본 ON으로 켜는 것이다.",
      why: "인용에서 `**`를 뗐다",
    },
    {
      kind: "번호 목록",
      content: "1. service_role 키는 서버에서만 쓴다.",
      quote: "service_role 키는 서버에서만 쓴다.",
      why: "인용에서 `1. `을 뗐다",
    },
    {
      kind: "곧은/둥근 따옴표",
      content: '정책 이름은 "목적_역할" 형식을 권한다.',
      quote: "정책 이름은 “목적_역할” 형식을 권한다.",
      why: '원문 " → 인용 “ ” (유니코드 다름)',
    },
    {
      kind: "하이픈/en dash",
      content: "select-insert-update 를 나눠 정의한다.",
      quote: "select–insert–update 를 나눠 정의한다.",
      why: "원문 - → 인용 – (U+2013)",
    },
    {
      kind: "말줄임표",
      content: "정책이 없으면 접근할 수 없다... 안전한 출발점이다.",
      quote: "정책이 없으면 접근할 수 없다… 안전한 출발점이다.",
      why: "원문 ... → 인용 … (U+2026)",
    },
    {
      kind: "문장 중간 줄바꿈 (대조군)",
      content: "정책은 SQL 마이그레이션 파일로\n작성해 버전 관리한다.",
      quote: "정책은 SQL 마이그레이션 파일로 작성해 버전 관리한다.",
      why: "줄바꿈→공백. 공백 정규화가 처리해야 한다",
    },
    {
      kind: "전각 공백 (대조군)",
      content: "정책은　SQL 파일로 관리한다.",
      quote: "정책은 SQL 파일로 관리한다.",
      why: "U+3000 전각 공백 → 반각. \\s 가 잡는지",
    },
  ];

  let fp = 0;
  for (const p of probes) {
    const refs: DraftSourceRef[] = [
      {
        provider: "claude",
        sourceAnswerId: "aaaaaaaa-0000-4000-8000-000000000001",
        sectionId: "claude-s1",
        title: "테스트",
        content: p.content,
      },
    ];
    const result = groundStances(
      {
        comparisonNote: "(테스트)",
        stances: [{ provider: "claude", quotes: [p.quote], text: "요약" }],
        disagreementType: "main_answer",
        confidence: 0.5,
      },
      refs,
      ["claude"],
    );
    const kept = result.quotesRejected === 0;
    if (!kept) fp += 1;
    console.log(
      `${kept ? "통과  " : "❌폐기"}  ${p.kind.padEnd(18)} ${p.why}`,
    );
    if (!kept) {
      console.log(`          원문: ${JSON.stringify(p.content.slice(0, 60))}`);
      console.log(`          인용: ${JSON.stringify(p.quote.slice(0, 60))}`);
    }
  }

  console.log(
    `\n→ ${probes.length}건 중 ${fp}건이 폐기됐다. **이들은 원문에 실재하는 내용이며 날조가 아니다.**`,
  );
  console.log(
    "  폐기되면 그 stance의 인용이 줄고, 인용이 0개가 되면 stance가 죽고, stance가 0개면 쟁점이 사라진다(§11-4).",
  );
}

// ---------------------------------------------------------------------------
// 단계 6·7 실측
// ---------------------------------------------------------------------------

interface RunSummary {
  drafts: number;
  judged: number;
  conflicts: number;
  dropped: number;
  stage3Ms: number | null;
  stage4Ms: number | null;
  stage6Ms: number;
  totalMs: number;
  firstJudgedAtMs: number;
  quoteRejectRate: number | null;
  agendaDropRate: number | null;
  judgeFailRate: number | null;
  typeDist: Record<string, number>;
  confidences: number[];
  stage6Tokens: number[];
  stage6Durations: number[];
  pivot: AiProvider;
  shuffleSeed: number;
  rejectedQuotes: RejectedQuote[];
  stancesDiscarded: Record<string, number>;
  droppedTitles: string[];
}

async function runOnce(
  questionId: string,
  questionMessage: string,
  sourceAnswers: SourceAnswer[],
): Promise<RunSummary> {
  const env = loadEnv();
  const startedAt = performance.now();

  const built = await buildAgendaDrafts(questionId, sourceAnswers);

  let firstJudgedAtMs = -1;
  const judged = await judgeDrafts({
    questionId,
    questionMessage,
    drafts: built.drafts,
    pivotProvider: built.managerMeta.pivotProvider,
    conflictTypes: built.managerMeta.conflictTypes,
    concurrency: env.MANAGER_CONCURRENCY,
    onJudged: () => {
      // 조기 표시가 실제로 작동하는지 — 첫 쟁점이 언제 나오는지가 체감 지연을 결정한다.
      if (firstJudgedAtMs < 0) {
        firstJudgedAtMs = Math.round(performance.now() - startedAt);
      }
    },
  });

  return {
    drafts: built.drafts.length,
    judged: judged.agendas.length,
    conflicts: judged.agendas.filter((a) => a.kind === "conflict").length,
    dropped: judged.droppedAgendaIds.length,
    stage3Ms: built.managerMeta.metrics.stageDurationsMs.stage3,
    stage4Ms: built.managerMeta.metrics.stageDurationsMs.stage4,
    stage6Ms: judged.wallClockMs,
    totalMs: Math.round(performance.now() - startedAt),
    firstJudgedAtMs,
    quoteRejectRate: judged.quality.quoteRejectRate,
    agendaDropRate: judged.quality.agendaDropRate,
    judgeFailRate: judged.quality.judgeFailRate,
    typeDist: judged.quality.disagreementTypeDist,
    confidences: judged.quality.confidences,
    stage6Tokens: judged.quality.stage6OutputTokens,
    stage6Durations: judged.quality.stage6DurationsMs,
    pivot: built.managerMeta.pivotProvider,
    shuffleSeed: built.managerMeta.shuffleSeed,
    rejectedQuotes: judged.rejectedQuotes,
    stancesDiscarded: judged.stancesDiscarded,
    droppedTitles: judged.droppedAgendaIds.map(
      (label) => built.drafts.find((d) => d.id === label)?.title ?? label,
    ),
  };
}

function reportRuns(questionId: string, runs: RunSummary[]): void {
  console.log("\n========================================");
  console.log(`questionId: ${questionId} · ${runs.length}회 실행`);
  console.log("========================================\n");

  console.log("--- 회차별 -------------------------------");
  for (const [i, r] of runs.entries()) {
    console.log(
      `  #${i + 1} 쟁점 ${r.drafts}→${r.judged}(폐기 ${r.dropped}, 충돌 ${r.conflicts}) ` +
        `단계3=${r.stage3Ms ?? "n/a"}ms 단계4=${r.stage4Ms ?? "n/a"}ms ` +
        `단계6=${r.stage6Ms}ms 전체=${r.totalMs}ms 첫판정=${r.firstJudgedAtMs}ms ` +
        `pivot=${r.pivot} seed=${r.shuffleSeed}`,
    );
  }

  const all = <T>(pick: (r: RunSummary) => T[]): T[] => runs.flatMap(pick);
  const nums = (pick: (r: RunSummary) => number | null): number[] =>
    runs.map(pick).filter((v): v is number => v !== null);

  console.log("\n--- 지연 (§2.3 예산 10~30초 대비) ---------");
  console.log(`  단계 6 wall-clock(병렬): ${stats(nums((r) => r.stage6Ms))}`);
  console.log(`  단계 6 쟁점당:           ${stats(all((r) => r.stage6Durations))}`);
  console.log(`  Manager 전체(3+4+6):     ${stats(nums((r) => r.totalMs))}`);
  console.log(
    `  ⭐ 첫 agenda.judged:      ${stats(nums((r) => r.firstJudgedAtMs))}  ← 체감 지연`,
  );

  console.log("\n--- 토큰 (§5.5 430 추정 대비) -------------");
  console.log(`  단계 6 쟁점당 출력 토큰: ${stats(all((r) => r.stage6Tokens))}`);

  console.log("\n--- 품질 지표 (§14.2) ---------------------");
  const qr = nums((r) => r.quoteRejectRate);
  const meanOf = (v: number[]): number | null =>
    v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length;
  console.log(
    `  quoteRejectRate:  ${pct(meanOf(qr))} (경고 10% 초과)${
      (meanOf(qr) ?? 0) > 0.1 ? "  ⚠️" : ""
    }`,
  );
  const ad = nums((r) => r.agendaDropRate);
  console.log(
    `  agendaDropRate:   ${pct(meanOf(ad))} (경고 5% 초과)${
      (meanOf(ad) ?? 0) > 0.05 ? "  ⚠️" : ""
    }`,
  );
  const jf = nums((r) => r.judgeFailRate);
  console.log(
    `  judgeFailRate:    ${pct(meanOf(jf))} (경고 10% 초과)${
      (meanOf(jf) ?? 0) > 0.1 ? "  ⚠️" : ""
    }`,
  );

  const dist: Record<string, number> = {};
  for (const r of runs) {
    for (const [k, v] of Object.entries(r.typeDist)) {
      dist[k] = (dist[k] ?? 0) + v;
    }
  }
  const distTotal = Object.values(dist).reduce((a, b) => a + b, 0);
  console.log(`\n  disagreementTypeDist (판정 ${distTotal}건):`);
  for (const key of [
    "paraphrasing",
    "detail_expansion",
    "detail_volume",
    "detail_content",
    "main_answer",
  ]) {
    const count = dist[key] ?? 0;
    const ratio = distTotal > 0 ? count / distTotal : 0;
    const warn =
      key === "main_answer" && distTotal > 0 && ratio < 0.05
        ? "  ⚠️ 5% 미만 — 충돌 과소 탐지 의심"
        : "";
    console.log(`    ${key.padEnd(18)} ${count}건 (${pct(ratio)})${warn}`);
  }

  console.log(`\n  confidence: ${stats(all((r) => r.confidences))}`);
  console.log("    → §14.3: 표준편차 < 0.05면 자기보고 확신도는 무의미하다고 판정");

  const rejects = runs.flatMap((r) => r.rejectedQuotes);
  if (rejects.length > 0) {
    console.log("\n--- 폐기된 인용 (원인 진단) ----------------");
    const byReason: Record<string, number> = {};
    for (const rq of rejects) byReason[rq.reason] = (byReason[rq.reason] ?? 0) + 1;
    for (const [reason, count] of Object.entries(byReason)) {
      console.log(`  ${reason}: ${count}건`);
    }
    for (const rq of rejects.slice(0, 12)) {
      console.log(
        `    [${rq.reason}] ${rq.provider}: ${JSON.stringify(rq.quote.slice(0, 100))}`,
      );
    }
    if (rejects.length > 12) console.log(`    ... 외 ${rejects.length - 12}건`);
  }

  // quote 검증 전에 버려진 stance — quoteRejectRate가 0%인데 쟁점이 폐기될 때의 원인이다.
  const discarded: Record<string, number> = {};
  for (const r of runs) {
    for (const [k, v] of Object.entries(r.stancesDiscarded)) {
      discarded[k] = (discarded[k] ?? 0) + v;
    }
  }
  const discardedTotal = Object.values(discarded).reduce((a, b) => a + b, 0);
  if (discardedTotal > 0) {
    console.log("\n--- 통째로 버려진 stance (스키마 위반) ----");
    for (const [reason, count] of Object.entries(discarded)) {
      if (count > 0) console.log(`  ${reason}: ${count}건`);
    }
  }

  const dropped = runs.flatMap((r) => r.droppedTitles);
  if (dropped.length > 0) {
    console.log("\n--- 폐기된 쟁점 (§11-4) -------------------");
    for (const t of dropped) console.log(`    ${t}`);
    if (discardedTotal === 0 && all((r) => r.rejectedQuotes.map(() => 1)).length === 0) {
      console.log(
        "    ⚠️ 폐기 사유 관측값이 없다 — quote 폐기도 stance 폐기도 0이다. 조사 필요.",
      );
    }
  }

  console.log("\n--- 재현성 (AC1) --------------------------");
  const pivots = new Set(runs.map((r) => r.pivot));
  const seeds = new Set(runs.map((r) => r.shuffleSeed));
  console.log(
    `  pivot: ${[...pivots].join(", ")} ${pivots.size === 1 ? "✅ 동일" : "❌ 흔들림"}`,
  );
  console.log(
    `  shuffleSeed: ${[...seeds].join(", ")} ${seeds.size === 1 ? "✅ 동일" : "❌ 흔들림"}`,
  );
  console.log("========================================\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.groundingTest) {
    fabricationCases();
    falsePositiveProbe();
    return;
  }

  const { questionId, questionMessage, sourceAnswers } = await loadInput(args);
  const runs: RunSummary[] = [];
  for (let i = 0; i < args.runs; i++) {
    console.log(`[${i + 1}/${args.runs}] 실행 중...`);
    const r = await runOnce(questionId, questionMessage, sourceAnswers);
    runs.push(r);
    // 회차마다 즉시 남긴다 — 중간에 죽어도 앞선 회차의 실측이 유실되지 않는다.
    console.log(
      `[${i + 1}/${args.runs}] 완료 · 쟁점 ${r.drafts}→${r.judged}(폐기 ${r.dropped}, 충돌 ${r.conflicts}) ` +
        `단계3=${r.stage3Ms ?? "n/a"}ms 단계6=${r.stage6Ms}ms 전체=${r.totalMs}ms ` +
        `첫판정=${r.firstJudgedAtMs}ms quoteReject=${pct(r.quoteRejectRate)} ` +
        `tokens=[${r.stage6Tokens.join(",")}] types=${JSON.stringify(r.typeDist)}`,
    );
  }
  reportRuns(questionId, runs);
}

main().catch((error: unknown) => {
  console.error(
    "manager:judge 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
