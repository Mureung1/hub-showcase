import OpenAI from "openai";

import { env } from "../config/env.js";

let client;

const getOpenAIClient = () => {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY가 설정되어 있지 않습니다.");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.openaiApiKey,
    });
  }

  return client;
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "readiness",
    "targetRole",
    "fitLevel",
    "portfolioLevel",
    "burnoutLevel",
    "strengths",
    "gaps",
    "recommendations",
  ],
  properties: {
    readiness: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },
    targetRole: {
      type: "string",
    },
    fitLevel: {
      type: "string",
      enum: ["높음", "보통", "보완 필요"],
    },
    portfolioLevel: {
      type: "string",
      enum: ["준비됨", "보완 필요"],
    },
    burnoutLevel: {
      type: "string",
      enum: ["낮음", "관리 필요"],
    },
    strengths: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    gaps: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
  },
};

export const generateCareerAnalysis = async ({ user, spec }) => {
  const openai = getOpenAIClient();

  const response = await openai.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: "developer",
        content:
          "너는 대학생 커리어 코치다. 사용자의 학교, 전공, 목표 직무, 스펙을 바탕으로 현실적인 취업 준비 분석을 한국어로 작성한다. 과장하지 말고, 부족한 항목은 구체적인 다음 행동으로 제안한다.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            user: {
              school: user.school,
              major: user.major,
            },
            spec,
          },
          null,
          2
        ),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "career_analysis",
        strict: true,
        schema: analysisSchema,
      },
    },
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("AI 분석 결과를 생성하지 못했습니다.");
  }

  return {
    result: JSON.parse(outputText),
    rawResponse: response,
  };
};
