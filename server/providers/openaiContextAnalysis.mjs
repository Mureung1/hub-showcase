import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ContextAnalysisApiError, toContextAnalysisApiError } from "../contextAnalysisErrors.mjs";
import { structuredContextAnalysisSchema } from "../contextAnalysisSchema.mjs";

const SYSTEM_INSTRUCTIONS = `당신은 협업 기록을 구조화하는 분석가입니다.
입력에 명시된 사실만 사용하고, 참여자의 성격·감정·능력·정치적 성향을 추론하지 마세요.
결정과 그 이유, 참여자별 프로젝트 관점, 근거 문장, 합의점, 관점 충돌, 다음 확인 질문을 한국어로 정리하세요.
이름이나 발언 주체가 불명확하면 actor 또는 ownerHint에 "확인 필요"라고 표시하세요.
evidence에는 해석이 아니라 입력 원문에서 판단 근거가 되는 짧은 문장을 넣으세요.
각 decision, participant, question의 evidence에도 입력 원문의 정확한 부분 문자열을 1개 이상 넣으세요.
입력에 없는 결정이나 질문을 만들어내지 말고, 해당 항목이 없으면 빈 배열을 반환하세요.`;

export async function analyzeWithOpenAI({ projectTitle, rawText }, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  const model = options.model || process.env.MODU_BRAIN_OPENAI_MODEL || "gpt-5.6-terra";
  const reasoningEffort =
    options.reasoningEffort || process.env.MODU_BRAIN_OPENAI_REASONING_EFFORT || "low";

  if (!apiKey) {
    throw new ContextAnalysisApiError(
      503,
      "PROVIDER_CONFIGURATION_ERROR",
      "OpenAI provider를 사용하려면 서버 환경변수 OPENAI_API_KEY가 필요합니다.",
      { missing: ["OPENAI_API_KEY"] },
    );
  }

  const client = options.client || new OpenAI({ apiKey, timeout: options.timeoutMs || 30_000 });

  try {
    const request = {
      model,
      store: false,
      reasoning: { effort: reasoningEffort },
      ...(options.safetyIdentifier ? { safety_identifier: options.safetyIdentifier } : {}),
      instructions: SYSTEM_INSTRUCTIONS,
      input: `프로젝트 이름: ${projectTitle}\n\n분석할 협업 기록:\n${rawText}`,
      text: {
        format: zodTextFormat(structuredContextAnalysisSchema, "modu_brain_context_analysis"),
      },
    };
    const response = options.signal
      ? await client.responses.parse(request, { signal: options.signal })
      : await client.responses.parse(request);

    if (!response.output_parsed) {
      throw new ContextAnalysisApiError(
        502,
        "PROVIDER_RESPONSE_INVALID",
        "외부 분석 provider가 구조화된 결과를 반환하지 않았습니다.",
      );
    }

    return {
      analysis: structuredContextAnalysisSchema.parse(response.output_parsed),
      provider: {
        mode: "llm",
        name: `openai:${model}`,
        usedExternalModel: true,
      },
    };
  } catch (error) {
    if (error instanceof ContextAnalysisApiError) {
      throw error;
    }

    if (error?.name === "ZodError") {
      throw new ContextAnalysisApiError(
        502,
        "PROVIDER_RESPONSE_INVALID",
        "외부 분석 provider 응답이 필수 스키마를 충족하지 않았습니다.",
      );
    }

    throw toContextAnalysisApiError(error);
  }
}
