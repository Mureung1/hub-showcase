import { loadEnv } from "../../../shared/config/env.js";
import { renderManagerPrompt } from "../../agendas/managerPrompts.js";
import {
  buildRequestBody,
  callOpenRouter,
  parseOutput,
  withOneRetry,
} from "../../agendas/adapters/openRouterCall.js";
import { ComposeOutputSchema } from "../finalAnswers.types.js";
import type {
  ComposeCallResult,
  ComposeInput,
  FinalAnswerComposer,
  PassedAgendaInput,
  RejectedAgendaInput,
} from "../ports/finalAnswerComposer.port.js";

/**
 * OpenRouter 기반 FinalAnswerComposer 어댑터 (SPEC-AI-003 §3).
 *
 * HTTP 호출·오류 분류·재시도·**타임아웃**은 `agendas/adapters/openRouterCall.ts`를
 * 그대로 재사용한다. §2.4.1의 수정(타이머를 본문 읽기까지 덮음)이 거기 있으므로
 * **새로 만들면 같은 함정에 빠진다** — 3초 타임아웃에 156.5초가 걸렸던 그 결함이다.
 */

/** §16.2 구분 블록. 사용자가 직접 쓴 내용이 섞일 수 있어 데이터임을 명시한다(§12). */
function formatPassed(agendas: PassedAgendaInput[]): string {
  if (agendas.length === 0) return "(없음)";
  return agendas
    .map((a, i) => {
      const refs =
        a.sourceRefSummary.length > 0
          ? `\n근거: ${a.sourceRefSummary.join(", ")}`
          : "";
      return `<agenda index="${i + 1}" title="${a.title}">\n${a.selectedContent}${refs}\n</agenda>`;
    })
    .join("\n\n");
}

function formatRejected(agendas: RejectedAgendaInput[]): string {
  if (agendas.length === 0) return "(없음)";
  return agendas.map((a) => `- ${a.title}`).join("\n");
}

/**
 * §3.3 — `single_source_fallback`이면 문구 제약을 추가한다.
 *
 * §5.3이 "다중 AI 합의로 표현하지 않으며, 일부 AI 답변이 제외되었다는 사실을 표시한다"를
 * 요구한다. **화면 표시는 §9, 문구 제약은 여기**가 담당한다.
 */
function modeInstruction(input: ComposeInput): string {
  if (input.mode !== "single_source_fallback") return "";
  const excluded = input.excludedProviders.join(", ");
  return [
    "## ⚠️ 이 답변의 특수 조건",
    "",
    "이 답변은 **하나의 AI만 응답해** 만들어졌다.",
    `응답하지 못한 AI: ${excluded || "(없음)"}`,
    "",
    "**여러 AI가 합의했다고 표현하지 마라.** \"모든 AI가 동의\", \"의견이 일치\" 같은",
    "표현은 사실이 아니다 — 비교할 상대가 없었을 뿐이다.",
  ].join("\n");
}

/** §3.2 출력 스키마. **`finalAnswer`가 앞에 온다** — 필드 순서가 사고 순서다. */
const COMPOSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    finalAnswer: {
      type: "string",
      description:
        "확정된 내용을 종합한 최종 답변. 입력에 없는 사실을 추가하지 마라. 제외된 쟁점의 내용을 answer에 넣지 마라.",
    },
    decisionNote: {
      type: "string",
      description:
        "위 최종 답변을 요약한 결정 기록. 무엇을 결정했는지가 드러나야 한다.",
    },
  },
  required: ["finalAnswer", "decisionNote"],
};

export function createOpenRouterComposer(): FinalAnswerComposer {
  const env = loadEnv();
  const version = env.COMPOSER_PROMPT_VERSION;
  const model = env.MANAGER_MODEL;

  /**
   * §3.4 — 호출 설정.
   * ⚠️ `reasoning`은 **무설정으로 시작한다.** 단계 6과 특성이 다르다(인용 복사가 아니라
   * 종합·요약). §14.5.4에서 단계 3에 `low`가 역효과였던 선례가 있어 실측 없이 넣지 않는다.
   * 타임아웃은 단계 6과 같은 120초이며 재시도하지 않는다(§2.4.2).
   */
  const call = async (
    prompt: string,
  ): Promise<{ content: string; outputTokens: number | null; reasoningTokens: number | null }> => {
    const body = buildRequestBody({
      model,
      prompt,
      schemaName: "final_answer",
      schema: COMPOSE_SCHEMA,
      // reasoningEffort 미지정 = 무설정
    });
    const result = await callOpenRouter(body, {
      timeoutMs: env.MANAGER_JUDGE_TIMEOUT_MS,
      retryOnTimeout: false,
    });
    return {
      content: result.content,
      outputTokens: result.outputTokens,
      reasoningTokens: result.reasoningTokens,
    };
  };

  return {
    version,

    async compose(input: ComposeInput): Promise<ComposeCallResult> {
      const prompt = await renderManagerPrompt("final", version, {
        question: input.question,
        passedAgendas: formatPassed(input.passed),
        rejectedAgendas: formatRejected(input.rejected),
        modeInstruction: modeInstruction(input),
      });
      return withOneRetry(async () => {
        const r = await call(prompt);
        return {
          output: parseOutput(r.content, ComposeOutputSchema, "FinalAnswer 생성"),
          completionTokens: r.outputTokens,
          reasoningTokens: r.reasoningTokens,
        };
      });
    },

    async composeNoteOnly(input) {
      // §5.2 — FinalAnswer는 이미 있으므로 요약만 다시 요청한다.
      const prompt = await renderManagerPrompt("finalNote", version, {
        question: input.question,
        finalAnswer: input.finalAnswer,
      });
      return withOneRetry(async () => {
        const r = await call(prompt);
        const parsed = parseOutput(r.content, ComposeOutputSchema, "DecisionNote 재생성");
        return {
          decisionNote: parsed.decisionNote,
          completionTokens: r.outputTokens,
        };
      });
    },
  };
}
