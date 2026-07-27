export type YoutubeContentErrorCode =
  | "INVALID_URL"
  | "URL_FETCH_FAILED";

export class YoutubeContentError extends Error {
  constructor(public readonly code: YoutubeContentErrorCode) {
    super(code);
  }
}

export interface ParsedYoutubeUrl {
  sourceUrl: string;
  videoId: string;
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function parseYoutubeUrl(
  sourceUrl: string,
): ParsedYoutubeUrl {
  const normalizedSourceUrl = sourceUrl.trim();

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedSourceUrl);
  } catch {
    throw new YoutubeContentError("INVALID_URL");
  }

  if (
    (parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:") ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new YoutubeContentError("INVALID_URL");
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  let videoId: string | null = null;

  if (
    hostname === "youtube.com" ||
    hostname === "www.youtube.com"
  ) {
    if (parsedUrl.pathname !== "/watch") {
      throw new YoutubeContentError("INVALID_URL");
    }

    videoId = parsedUrl.searchParams.get("v");
  } else if (hostname === "youtu.be") {
    const pathSegments = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    if (pathSegments.length !== 1) {
      throw new YoutubeContentError("INVALID_URL");
    }

    videoId = pathSegments[0] ?? null;
  } else {
    throw new YoutubeContentError("INVALID_URL");
  }

  if (
    !videoId ||
    !YOUTUBE_VIDEO_ID_PATTERN.test(videoId)
  ) {
    throw new YoutubeContentError("INVALID_URL");
  }

  return {
    sourceUrl: normalizedSourceUrl,
    videoId,
  };
}

export interface YoutubeMetadata {
  title: string;
  author: string;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function fetchYoutubeMetadata(
  videoId: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<YoutubeMetadata> {
  if (
    !YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ||
    !apiKey.trim() ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new YoutubeContentError("URL_FETCH_FAILED");
  }

  const apiUrl = new URL(
    "https://www.googleapis.com/youtube/v3/videos",
  );

  apiUrl.searchParams.set("part", "snippet");
  apiUrl.searchParams.set("id", videoId);
  apiUrl.searchParams.set("key", apiKey);
  apiUrl.searchParams.set(
    "fields",
    "items(snippet(title,channelTitle))",
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(apiUrl, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new YoutubeContentError("URL_FETCH_FAILED");
    }

    const responseBody: unknown = await response.json();

    if (
      !isRecord(responseBody) ||
      !Array.isArray(responseBody.items)
    ) {
      throw new YoutubeContentError("URL_FETCH_FAILED");
    }

    const firstItem: unknown = responseBody.items[0];

    if (
      !isRecord(firstItem) ||
      !isRecord(firstItem.snippet) ||
      typeof firstItem.snippet.title !== "string" ||
      !firstItem.snippet.title.trim() ||
      typeof firstItem.snippet.channelTitle !== "string" ||
      !firstItem.snippet.channelTitle.trim()
    ) {
      throw new YoutubeContentError("URL_FETCH_FAILED");
    }

    return {
      title: firstItem.snippet.title.trim(),
      author: firstItem.snippet.channelTitle.trim(),
    };
  } catch (error) {
    if (error instanceof YoutubeContentError) {
      throw error;
    }

    throw new YoutubeContentError("URL_FETCH_FAILED");
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isYoutubeSourceUrl(sourceUrl: string): boolean {
  try {
    const parsedUrl = new URL(sourceUrl.trim());
    const hostname = parsedUrl.hostname.toLowerCase();

    return (
      (parsedUrl.protocol === "http:" ||
        parsedUrl.protocol === "https:") &&
      (hostname === "youtube.com" ||
        hostname === "www.youtube.com" ||
        hostname === "youtu.be")
    );
  } catch {
    return false;
  }
}

export interface CollectedYoutubeContent {
  text: string;
  source: {
    url: string;
    title: string;
    author: string;
  };
}

interface CollectYoutubeContentDependencies {
  youtubeApiKey: string;
  fetchMetadata: (
    videoId: string,
    apiKey: string,
  ) => Promise<YoutubeMetadata>;
  fetchTranscript: (
    videoId: string,
  ) => Promise<string>;
  analyzeWithGemini: (
    input: GeminiYoutubeInput,
  ) => Promise<string>;
}

export async function collectYoutubeContent(
  sourceUrl: string,
  dependencies: CollectYoutubeContentDependencies,
): Promise<CollectedYoutubeContent> {
  const parsedYoutubeUrl = parseYoutubeUrl(sourceUrl);

  const metadata = await dependencies.fetchMetadata(
    parsedYoutubeUrl.videoId,
    dependencies.youtubeApiKey,
  );

  let contentText: string;

  try {
    contentText = await dependencies.fetchTranscript(
      parsedYoutubeUrl.videoId,
    );
  } catch {
    try {
      contentText = await dependencies.analyzeWithGemini({
        sourceUrl: parsedYoutubeUrl.sourceUrl,
        title: metadata.title,
        author: metadata.author,
      });
    } catch {
      throw new YoutubeContentError("URL_FETCH_FAILED");
    }
  }

  return {
    text: contentText,
    source: {
      url: parsedYoutubeUrl.sourceUrl,
      title: metadata.title,
      author: metadata.author,
    },
  };
}

const YOUTUBE_TRANSCRIPT_SCRIPT_PATH = fileURLToPath(
  new URL("../../scripts/fetchYoutubeTranscript.py", import.meta.url),
);

export async function collectYoutubeContentFromEnvironment(
  sourceUrl: string,
): Promise<CollectedYoutubeContent> {
  const youtubeApiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();

  if (!youtubeApiKey) {
    throw new YoutubeContentError("URL_FETCH_FAILED");
  }

  return collectYoutubeContent(sourceUrl, {
    youtubeApiKey,
    fetchMetadata: fetchYoutubeMetadata,
    fetchTranscript: (videoId) =>
      runYoutubeTranscript({
        videoId,
        pythonExecutable:
          process.platform === "win32" ? "python" : "python3",
        scriptPath: YOUTUBE_TRANSCRIPT_SCRIPT_PATH,
        timeoutMs: 10_000,
        maxOutputLength: 20_000,
      }),
    analyzeWithGemini: (input) => {
      const apiKey = process.env.GEMINI_API_KEY?.trim();

      if (!apiKey) {
        throw new YoutubeContentError("URL_FETCH_FAILED");
      }

      return analyzeYoutubeWithGemini(input, {
        apiKey,
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash",
        timeoutMs: 15_000,
      });
    },
  });
}
import { fileURLToPath } from "node:url";
import {
  analyzeYoutubeWithGemini,
  type GeminiYoutubeInput,
} from "./geminiYoutube.service.js";
import { runYoutubeTranscript } from "./youtubeTranscript.service.js";
