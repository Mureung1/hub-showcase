// Gemini 구조화 출력(Structured Output) 호출 헬퍼.
// 근거: docs/research.md §8 — SDK 없이 Deno raw REST fetch로 직접 호출.

// `gemini-2.5-flash`는 503 UNAVAILABLE(용량 초과)이 반복돼 `/알림` 파싱과 복기가 함께 막혔다.
// `-latest` 별칭은 구글이 가용한 최신 flash로 연결해 주므로 특정 버전 용량 부족을 우회한다.
// 모델을 고정하려면 GEMINI_MODEL 시크릿을 설정한다(재배포 없이 교체 가능).
const DEFAULT_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest";

export interface GenerateStructuredParams {
  /** 사용자 프롬프트(자연어 입력) */
  prompt: string;
  /** 강제할 JSON 스키마 (responseJsonSchema로 전달) */
  schema: unknown;
  /** 시스템 지시문(선택) */
  system?: string;
  /** 모델명 override (기본 gemini-2.5-flash) */
  model?: string;
}

interface GeminiContentPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiContentPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

/**
 * Gemini generateContent를 raw REST로 호출해 JSON 스키마에 맞는 구조화 결과를 반환한다.
 * POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */
export async function generateStructured(
  { prompt, schema, system, model = DEFAULT_MODEL }: GenerateStructuredParams,
): Promise<unknown> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 필요합니다.");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  };

  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini 호출 실패 (${res.status}): ${text}`);
  }

  const payload = (await res.json()) as GeminiResponse;
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("");

  if (!text) {
    throw new Error(
      `Gemini 응답에 텍스트가 없습니다: ${JSON.stringify(payload)}`,
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini 응답 JSON 파싱 실패: ${text}`);
  }
}

// =========================================================
// function-calling 에이전트 루프 (docs/prd.md §6 — 복기 코칭 에이전트)
// 1-shot이 아니라 도구를 스스로 다단계 호출해 근거를 모은 뒤 구조화 결론을 낸다.
// =========================================================

/** functionDeclarations 한 항목 (OpenAPI subset 파라미터 스키마 포함) */
export interface AgentToolDeclaration {
  name: string;
  description: string;
  /** 도구 파라미터 JSON 스키마 (Gemini functionDeclarations.parameters) */
  parameters: Record<string, unknown>;
}

export interface RunAgentLoopParams {
  /** 시스템 지시문 */
  system: string;
  /** 첫 user turn 텍스트(대상 컨텍스트 + 도구 사용 지침) */
  initialUserText: string;
  /** 사용 가능한 도구 선언 */
  tools: AgentToolDeclaration[];
  /** 도구 실행기. 실패 시 throw하면 루프가 functionResponse에 { error }를 실어 전달한다. */
  executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** 도구 호출 상한 (기본 6) */
  maxToolCalls?: number;
  /** 마무리 호출에서 강제할 최종 JSON 스키마 */
  finalSchema: unknown;
  /** 모델명 override */
  model?: string;
}

export interface RunAgentLoopResult {
  /** 파싱된 최종 JSON */
  output: unknown;
  /** 실제 실행된 도구 호출 수 */
  toolCallCount: number;
  /** 대화 누적(contents) — 감사/디버그용 */
  transcript: GeminiTurn[];
}

interface GeminiFunctionCall {
  name: string;
  args?: Record<string, unknown>;
}

interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

interface GeminiTurn {
  role: "user" | "model";
  parts: GeminiPart[];
}

/** generateContent를 raw REST로 1회 호출해 첫 candidate의 parts를 반환한다. */
async function callGenerateContent(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<GeminiPart[]> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini 호출 실패 (${res.status}): ${text}`);
  }

  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };
  return payload.candidates?.[0]?.content?.parts ?? [];
}

/**
 * Gemini function calling 루프.
 *
 * 동작:
 * 1. systemInstruction + tools(functionDeclarations)를 넣고 generateContent 반복 호출.
 * 2. 응답 parts에 functionCall이 있으면 executeTool 실행 → model turn(functionCall)과
 *    user turn(functionResponse: { name, response })을 contents에 누적한 뒤 재호출.
 *    - 도구 실행 실패 시 response에 { error }를 실어 전달(환각 방지: 실패 근거는 제외).
 * 3. functionCall 없이 텍스트로 끝나거나 maxToolCalls 도달 시 **마무리 호출**:
 *    "도구 호출 없이 최종 결론을 JSON으로 출력하라" user turn을 추가하고,
 *    tools 없이 responseJsonSchema=finalSchema로 구조화 출력을 강제한다.
 */
export async function runAgentLoop(
  {
    system,
    initialUserText,
    tools,
    executeTool,
    maxToolCalls = 6,
    finalSchema,
    model = DEFAULT_MODEL,
  }: RunAgentLoopParams,
): Promise<RunAgentLoopResult> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 필요합니다.");
  }

  const systemInstruction = { parts: [{ text: system }] };
  const functionDeclarations = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  const contents: GeminiTurn[] = [
    { role: "user", parts: [{ text: initialUserText }] },
  ];

  let toolCallCount = 0;

  // ── 도구 호출 루프 ──────────────────────────────────────
  while (true) {
    const parts = await callGenerateContent(apiKey, model, {
      systemInstruction,
      contents,
      tools: [{ functionDeclarations }],
    });

    const calls = parts.filter((p) => p.functionCall);
    if (calls.length === 0) {
      // 도구 호출 없이 텍스트로 끝남 → 마무리 호출로 이동
      break;
    }

    // model turn(functionCall들)을 그대로 누적
    contents.push({ role: "model", parts });

    // 각 functionCall 실행 → functionResponse 누적
    const responseParts: GeminiPart[] = [];
    for (const p of calls) {
      const call = p.functionCall!;
      toolCallCount++;
      let response: Record<string, unknown>;
      try {
        const result = await executeTool(call.name, call.args ?? {});
        response = { result };
      } catch (error) {
        // 실패 근거는 제외하라는 시스템 프롬프트와 합치 (환각 방지)
        response = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
      responseParts.push({
        functionResponse: { name: call.name, response },
      });
    }
    contents.push({ role: "user", parts: responseParts });

    if (toolCallCount >= maxToolCalls) break;
  }

  // ── 마무리 호출: 도구 없이 구조화 출력 강제 ────────────────
  contents.push({
    role: "user",
    parts: [{
      text:
        "이제 더 이상 도구를 호출하지 말고, 지금까지 도구로 모은 근거만으로 " +
        "최종 결론을 지정된 JSON 스키마에 맞춰 출력하라.",
    }],
  });

  const finalParts = await callGenerateContent(apiKey, model, {
    systemInstruction,
    contents,
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: finalSchema,
    },
  });

  contents.push({ role: "model", parts: finalParts });

  const text = finalParts.map((p) => p.text ?? "").join("");
  if (!text) {
    throw new Error("Gemini 마무리 응답에 텍스트가 없습니다.");
  }

  let output: unknown;
  try {
    output = JSON.parse(text);
  } catch {
    throw new Error(`Gemini 마무리 응답 JSON 파싱 실패: ${text}`);
  }

  return { output, toolCallCount, transcript: contents };
}
