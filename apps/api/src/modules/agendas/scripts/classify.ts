import "dotenv/config";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { SourceAnswerSchema, type SourceAnswer } from "@decision-log/shared";

import { getAdminClient } from "../../../shared/supabase/adminClient.js";
import { listByQuestion } from "../../sourceAnswers/sourceAnswers.repository.js";
import { buildAgendaDrafts } from "../agendas.service.js";
import type { BuildAgendaDraftsResult } from "../agendas.types.js";

/**
 * 개발 전용 검증 스크립트 (SPEC-AI-002 §G, T-019.2의 유일한 진입점).
 * DB에 쓰지 않는 읽기 전용이며 프로덕션 경로에 연결되지 않는다.
 *
 *   npm run manager:classify -- --question <uuid>
 *   npm run manager:classify -- --fixture <path.json>
 *
 * fixture 형식: { "questionId": "<uuid>", "sourceAnswers": SourceAnswer[] }
 */

const FixtureSchema = z.object({
  questionId: z.uuid(),
  sourceAnswers: z.array(SourceAnswerSchema),
});

function parseArgs(argv: string[]): { question?: string; fixture?: string } {
  const out: { question?: string; fixture?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--question") out.question = argv[++i];
    else if (argv[i] === "--fixture") out.fixture = argv[++i];
  }
  return out;
}

async function loadInput(args: {
  question?: string;
  fixture?: string;
}): Promise<{ questionId: string; sourceAnswers: SourceAnswer[] }> {
  if (args.fixture) {
    const raw = await readFile(args.fixture, "utf8");
    const parsed = FixtureSchema.parse(JSON.parse(raw));
    return { questionId: parsed.questionId, sourceAnswers: parsed.sourceAnswers };
  }
  if (args.question) {
    const admin = getAdminClient();
    const sourceAnswers = await listByQuestion(admin, args.question);
    return { questionId: args.question, sourceAnswers };
  }
  throw new Error("사용법: --question <uuid> 또는 --fixture <path.json>");
}

function pct(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(0)}%`;
}

function report(
  questionId: string,
  input: SourceAnswer[],
  result: BuildAgendaDraftsResult,
): void {
  const { drafts, managerMeta, trace } = result;
  const m = managerMeta.metrics;

  console.log("========================================");
  console.log(`questionId: ${questionId}`);
  console.log(
    `입력 SourceAnswer: ${input.length}개 (succeeded ${
      input.filter((a) => a.status === "succeeded" && !a.excludedFromComparison)
        .length
    }개)`,
  );
  console.log(
    `pivot: ${managerMeta.pivotProvider} (${managerMeta.pivotSelectionReason}), shuffleSeed=${managerMeta.shuffleSeed}`,
  );
  if (managerMeta.lastError) console.log(`⚠️ lastError: ${managerMeta.lastError}`);

  console.log("\n--- 쟁점 목록 -----------------------------");
  for (const d of drafts) {
    const providers = [...new Set(d.sourceRefs.map((r) => r.provider))].join(", ");
    const sectionIds = d.sourceRefs.map((r) => r.sectionId).join(", ");
    console.log(
      `  [${d.id}] (${d.origin}, 참여 ${d.participantCount}) ${d.title}`,
    );
    console.log(`       provider: ${providers}`);
    console.log(`       섹션: ${sectionIds}`);
    console.log(`       summary: ${d.summary}`);
  }
  if (drafts.length === 0) console.log("  (없음)");

  console.log("\n--- leftover 처리 -------------------------");
  console.log(`  leftover 섹션: ${trace.leftoverSectionIds.join(", ") || "(없음)"}`);
  console.log(
    `  재배정: ${
      trace.reassignments
        .map((r) => `${r.sectionId}→${r.agendaId}`)
        .join(", ") || "(없음)"
    }`,
  );
  console.log(`  신규 쟁점: ${trace.newAgendaIds.join(", ") || "(없음)"}`);
  console.log(
    `  단계 3b 호출: ${trace.stage3bInvoked} / 단계 3 실패: ${trace.stage3Failed} / 단계 4 실행: ${trace.stage4Ran}`,
  );

  console.log("\n--- 제목 중립화 전후 ----------------------");
  if (trace.titleRevisions.length === 0) console.log("  (수정 없음)");
  for (const tr of trace.titleRevisions) {
    console.log(`  [${tr.agendaId}] "${tr.before}" → "${tr.after}"`);
  }

  console.log("\n--- 단계 3 호출 (provider별 분할, §5.1) ----");
  const calls = trace.stage3Calls;
  for (const c of calls) {
    const warn = c.tokens !== null && c.tokens > 1500 ? " ⚠️>1500" : "";
    const status = c.ok ? "OK" : "❌FAIL";
    console.log(
      `  ${c.provider}: ${status} tokens=${c.tokens ?? "n/a"}${warn} ${c.durationMs}ms${c.retried ? " (3b 재호출)" : ""}`,
    );
  }
  if (calls.length === 0) console.log("  (호출 없음 — 성공 1개 특수 경로)");
  const okTokens = calls.filter((c) => c.tokens !== null).map((c) => c.tokens ?? 0);
  const totalTokens = okTokens.reduce((a, b) => a + b, 0);
  const maxCallTokens = okTokens.length > 0 ? Math.max(...okTokens) : 0;
  const durations = calls.map((c) => c.durationMs);
  const slowest = durations.length > 0 ? Math.max(...durations) : 0;
  const sumDur = durations.reduce((a, b) => a + b, 0);
  const failCount = calls.filter((c) => !c.ok).length;
  console.log(
    `  → 호출당 최대 토큰=${maxCallTokens}(경고 1,500 기준) / 합계=${totalTokens}(§5.5 800 가정 대비)`,
  );
  console.log(
    `  → 지연: 가장 느린 호출=${slowest}ms / 합계=${sumDur}ms / 실패 호출=${failCount}건`,
  );

  console.log("\n--- 지표 (§14.1) --------------------------");
  console.log(`  leftoverRate:      ${pct(m.leftoverRate)}`);
  console.log(`  multiAssignRate:   ${pct(m.multiAssignRate)}`);
  console.log(`  reassignmentRate:  ${pct(m.reassignmentRate)}`);
  console.log(`  titleRevisionRate: ${pct(m.titleRevisionRate)}`);
  console.log(`  stage3OutputTokens(합계): ${m.stage3OutputTokens ?? "n/a"}`);
  console.log(
    `  단계별 소요(ms, 병렬): 단계3=${m.stageDurationsMs.stage3 ?? "n/a"}(wall-clock≈가장느린호출) 단계4=${
      m.stageDurationsMs.stage4 ?? "n/a"
    } 합계=${m.stageDurationsMs.total}`,
  );

  console.log("\n--- manager_meta (전체) -------------------");
  console.log(JSON.stringify(managerMeta, null, 2));
  console.log("========================================\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { questionId, sourceAnswers } = await loadInput(args);
  const result = await buildAgendaDrafts(questionId, sourceAnswers);
  report(questionId, sourceAnswers, result);
}

main().catch((error: unknown) => {
  console.error(
    "manager:classify 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
