import { GoogleGenAI, Type } from "@google/genai";
import type { ChatMessage } from "./messages";
import type { AgentPromptConfig } from "./agentPrompts";

const MODEL = "gemini-flash-latest";

export interface AgentChatResult {
  reply: string;
  readyToGenerateDoc: boolean;
  document?: string;
}

// Shared by every agent — only the system instruction differs per agent_name
// (see agentPrompts.ts). Detection ("has enough info been gathered") and
// document drafting both happen in this one structured call rather than a
// separate round-trip, to keep the chat responsive.
export async function askAgent(
  agentConfig: AgentPromptConfig,
  history: ChatMessage[],
  userMessage: string
): Promise<AgentChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const questionCount = history.filter((m) => m.from === "agent").length;
  const context = await agentConfig.gatherContext();

  const contents = [
    ...history.map((m) => ({
      role: m.from === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: agentConfig.buildSystemInstruction(context, questionCount),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING, description: "사용자에게 보여줄 대화 응답" },
          readyToGenerateDoc: { type: Type.BOOLEAN, description: "문서를 생성할 준비가 되었는지" },
          document: { type: Type.STRING, description: "readyToGenerateDoc이 true일 때만 채우는 전체 마크다운 문서" },
        },
        required: ["reply", "readyToGenerateDoc"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(response.text) as AgentChatResult;
  } catch {
    throw new Error("Gemini returned malformed structured output.");
  }
}
