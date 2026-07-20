import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TechnicalChallengeAiRequest } from "./technical-challenge.models";

export const TECHNICAL_CHALLENGE_AI_CLIENT = Symbol("TECHNICAL_CHALLENGE_AI_CLIENT");

export class TechnicalChallengeAiUnavailableError extends Error {
  constructor() {
    super("AI 분석 provider 설정이 없습니다.");
    this.name = "TechnicalChallengeAiUnavailableError";
  }
}

export class TechnicalChallengeAiResponseError extends Error {
  constructor(public readonly status: number) {
    super(`AI 분석 provider 요청에 실패했습니다. (${status})`);
    this.name = "TechnicalChallengeAiResponseError";
  }
}

export type TechnicalChallengeAiClient = {
  generate(request: TechnicalChallengeAiRequest): Promise<string>;
};

@Injectable()
export class HttpTechnicalChallengeAiClient implements TechnicalChallengeAiClient {
  constructor(private readonly configService: ConfigService) {}

  async generate(request: TechnicalChallengeAiRequest): Promise<string> {
    const url = this.configService.get<string>("AI_API_URL")?.trim();
    const apiKey = this.configService.get<string>("AI_API_KEY")?.trim();
    const configuredModel = this.configService.get<string>("AI_MODEL")?.trim();

    if (!url || !apiKey || !configuredModel) {
      throw new TechnicalChallengeAiUnavailableError();
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model || configuredModel,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        temperature: request.temperature,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new TechnicalChallengeAiResponseError(response.status);
    }

    const body = await response.text();
    return extractResponseText(body);
  }
}

function extractResponseText(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (isRecord(parsed)) {
      const choices = parsed.choices;
      if (Array.isArray(choices)) {
        const content = choices[0] && isRecord(choices[0])
          ? choices[0].message && isRecord(choices[0].message)
            ? choices[0].message.content
            : null
          : null;
        if (typeof content === "string") {
          return content;
        }
      }

      if (typeof parsed.output_text === "string") {
        return parsed.output_text;
      }
      if (typeof parsed.text === "string") {
        return parsed.text;
      }
    }
  } catch {
    return body;
  }

  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
