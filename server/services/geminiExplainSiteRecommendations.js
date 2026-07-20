import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
const optionalExplanationText = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().min(1).max(400).optional(),
);
const optionalExplanationList = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.array(z.string().trim().min(1).max(240)).max(3).optional(),
);
const explanationSchema = z.object({
  siteId: z.string().min(1),
  recommendationReason: optionalExplanationText,
  profileReasons: optionalExplanationList,
  complementaryReasons: optionalExplanationList,
});
const responseSchema = z.object({ explanations: z.array(explanationSchema).max(6) });

const responseJsonSchema = {
  type: Type.OBJECT,
  properties: {
    explanations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          siteId: { type: Type.STRING },
          recommendationReason: { type: Type.STRING, nullable: true },
          profileReasons: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
          complementaryReasons: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
        },
        required: ["siteId"],
        propertyOrdering: ["siteId", "recommendationReason", "profileReasons", "complementaryReasons"],
      },
    },
  },
  required: ["explanations"],
  propertyOrdering: ["explanations"],
};

function parseJsonOutput(outputText) {
  return JSON.parse(
    String(outputText || "")
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim(),
  );
}

export function parseGeminiExplanationOutput(outputText) {
  const parsed = parseJsonOutput(outputText);
  const explanations = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.explanations)
      ? parsed.explanations
      : Array.isArray(parsed?.recommendations)
        ? parsed.recommendations
        : [];

  return responseSchema.parse({ explanations });
}

export async function geminiExplainSiteRecommendations({
  profile,
  recommendations,
  trackedSites,
  client: injectedClient,
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API 키가 없습니다.");
  }

  const allowedSites = recommendations.map((recommendation) => ({
    siteId: recommendation.siteId,
    name: recommendation.name,
    recommendationReason: recommendation.recommendationReason,
    profileReasons: recommendation.profileReasons,
    complementaryReasons: recommendation.complementaryReasons,
    informationTypes: recommendation.informationTypes,
  }));
  const client = injectedClient || new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    contents: JSON.stringify({ profile, trackedSiteIds: trackedSites.map((site) => site.id), allowedSites }),
    config: {
      responseMimeType: "application/json",
      responseSchema: responseJsonSchema,
      temperature: 0.2,
      systemInstruction: "너는 등록된 정보 사이트 추천의 설명만 다듬는다. allowedSites에 있는 siteId만 반환한다. URL, 사이트명, 정보 종류, 점수, 신뢰도는 생성하거나 변경하지 않는다. 제공된 근거를 벗어난 사실을 추가하지 않는다. 모든 문장은 한국어로 짧고 구체적으로 작성한다. 반드시 {\"explanations\":[...]} 객체만 반환한다. explanations의 각 항목에는 siteId를 넣고, 근거가 없으면 recommendationReason, profileReasons, complementaryReasons를 생략한다. JSON Schema 이외의 설명 문장은 출력하지 않는다.",
    },
  });

  return parseGeminiExplanationOutput(response.text);
}