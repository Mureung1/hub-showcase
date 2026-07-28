import { GoogleGenAI, Type } from "@google/genai";
import type { ChatMessage } from "./messages";
import type { FileAgentPromptConfig } from "./fileAgentPrompts";

const MODEL = "gemini-flash-latest";
const MAX_RETRIES = 2; // total attempts = 1 + MAX_RETRIES

export interface FileChangeDraft {
  path: string;
  changeType: "new" | "modified" | "deleted";
  diff: string;
  suggestedCommitMessage: string;
}

export interface FileAgentResult {
  reply: string;
  readyToGenerateFiles: boolean;
  files?: FileChangeDraft[];
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: "사용자에게 보여줄 대화 응답" },
    readyToGenerateFiles: { type: Type.BOOLEAN, description: "파일을 생성할 준비가 되었는지" },
    files: {
      type: Type.ARRAY,
      description: "readyToGenerateFiles가 true일 때만 채우는 파일별 변경 목록",
      items: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING },
          changeType: { type: Type.STRING, enum: ["new", "modified", "deleted"] },
          diff: { type: Type.STRING },
          suggestedCommitMessage: { type: Type.STRING },
        },
        required: ["path", "changeType", "diff", "suggestedCommitMessage"],
      },
    },
  },
  required: ["reply", "readyToGenerateFiles"],
} as const;

// Same structured-output approach as agentChat.ts, but the model has been
// observed to occasionally truncate long multi-file JSON responses (diff
// strings are long) — so unlike the single-document agents, this one retries
// with an explicit "respond with valid JSON only" nudge before giving up.
export async function askFileAgent(
  agentConfig: FileAgentPromptConfig,
  history: ChatMessage[],
  userMessage: string
): Promise<FileAgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const questionCount = history.filter((m) => m.from === "agent").length;
  const context = await agentConfig.gatherContext();
  const systemInstruction = agentConfig.buildSystemInstruction(context, questionCount);

  const baseContents = [
    ...history.map((m) => ({
      role: m.from === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const contents =
      attempt === 0
        ? baseContents
        : [
            ...baseContents,
            {
              role: "user",
              parts: [
                {
                  text: "이전 응답이 유효한 JSON으로 파싱되지 않았습니다. 다른 설명 없이, 스키마에 맞는 순수 JSON만 다시 응답해주세요.",
                },
              ],
            },
          ];

    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      if (!response.text) {
        lastError = new Error("Gemini returned an empty response.");
        continue;
      }

      return JSON.parse(response.text) as FileAgentResult;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Gemini structured output failed after ${MAX_RETRIES + 1} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
