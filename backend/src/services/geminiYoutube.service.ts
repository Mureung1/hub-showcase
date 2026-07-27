export interface GeminiYoutubeInput {
  sourceUrl: string;
  title: string;
  author: string;
}

export interface AnalyzeYoutubeWithGeminiOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export class GeminiYoutubeError extends Error {
  constructor() {
    super("GEMINI_YOUTUBE_FAILED");
  }
}

const GEMINI_MAX_OUTPUT_LENGTH = 20_000;
const GEMINI_MODEL_PATTERN = /^[a-z0-9][a-z0-9.-]*$/;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function extractGeminiText(
  responseBody: unknown,
): string | null {
  if (
    !isRecord(responseBody) ||
    !Array.isArray(responseBody.candidates)
  ) {
    return null;
  }

  const firstCandidate: unknown =
    responseBody.candidates[0];

  if (
    !isRecord(firstCandidate) ||
    !isRecord(firstCandidate.content) ||
    !Array.isArray(firstCandidate.content.parts)
  ) {
    return null;
  }

  const firstTextPart = firstCandidate.content.parts.find(
    (part: unknown) =>
      isRecord(part) &&
      typeof part.text === "string" &&
      part.text.trim().length > 0,
  );

  if (
    !isRecord(firstTextPart) ||
    typeof firstTextPart.text !== "string"
  ) {
    return null;
  }

  const text = firstTextPart.text.trim();

  if (text.length > GEMINI_MAX_OUTPUT_LENGTH) {
    return null;
  }

  return text;
}

export async function analyzeYoutubeWithGemini(
  input: GeminiYoutubeInput,
  {
    apiKey,
    model,
    timeoutMs,
    fetchImpl = fetch,
  }: AnalyzeYoutubeWithGeminiOptions,
): Promise<string> {
  if (
    !input.sourceUrl.trim() ||
    !input.title.trim() ||
    !input.author.trim() ||
    !apiKey.trim() ||
    !GEMINI_MODEL_PATTERN.test(model) ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new GeminiYoutubeError();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    const endpoint =
      `https://generativelanguage.googleapis.com/` +
      `v1beta/models/${model}:generateContent`;

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                file_data: {
                  file_uri: input.sourceUrl,
                },
              },
              {
                text: [
                  "이 공개 YouTube 영상에서 레시피 정보를 추출하세요.",
                  `영상 제목: ${input.title}`,
                  `채널명: ${input.author}`,
                  "재료, 분량과 조리 단계를 빠짐없이 일반 텍스트로 작성하세요.",
                  "영상에서 확인할 수 없는 내용은 추정하지 마세요.",
                ].join("\n"),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new GeminiYoutubeError();
    }

    const responseBody: unknown = await response.json();
    const result = extractGeminiText(responseBody);

    if (!result) {
      throw new GeminiYoutubeError();
    }

    return result;
  } catch (error) {
    if (error instanceof GeminiYoutubeError) {
      throw error;
    }

    throw new GeminiYoutubeError();
  } finally {
    clearTimeout(timeoutId);
  }
}