const MAX_ARTIFACT_TEXT_LENGTH = 12000;
const FETCH_TIMEOUT_MS = 8000;

const privateHostnamePatterns = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[?::1\]?$/i,
];

const textLikeMimeTypes = [
  "application/json",
  "application/javascript",
  "application/xml",
  "application/x-javascript",
  "image/svg+xml",
];

const truncateText = (value) => String(value || "").slice(0, MAX_ARTIFACT_TEXT_LENGTH);

const normalizeWhitespace = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const isTextLike = (contentType = "") => {
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();

  return normalizedType.startsWith("text/") || textLikeMimeTypes.includes(normalizedType);
};

const stripHtml = (html) =>
  normalizeWhitespace(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

const isBlockedHostname = (hostname) =>
  privateHostnamePatterns.some((pattern) => pattern.test(hostname));

export const fetchSubmittedUrlText = async (submittedUrl) => {
  if (!submittedUrl) {
    return null;
  }

  const url = new URL(submittedUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      source: "url",
      status: "skipped",
      reason: "http 또는 https 링크만 평가할 수 있습니다.",
      url: submittedUrl,
      text: "",
    };
  }

  if (isBlockedHostname(url.hostname)) {
    return {
      source: "url",
      status: "blocked",
      reason: "내부망 또는 로컬 주소로 보이는 링크는 서버에서 열람하지 않습니다.",
      url: submittedUrl,
      text: "",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(submittedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "CareerMissionAI/1.0",
      },
    });

    if (!response.ok) {
      return {
        source: "url",
        status: "failed",
        reason: `링크 응답 상태가 ${response.status}입니다.`,
        url: submittedUrl,
        text: "",
      };
    }

    const contentType = response.headers.get("content-type") || "";

    if (!isTextLike(contentType)) {
      return {
        source: "url",
        status: "skipped",
        reason: `텍스트로 읽을 수 없는 콘텐츠 타입입니다: ${contentType || "unknown"}`,
        url: submittedUrl,
        text: "",
      };
    }

    const rawText = await response.text();
    const text = contentType.toLowerCase().includes("html")
      ? stripHtml(rawText)
      : normalizeWhitespace(rawText);

    return {
      source: "url",
      status: text ? "fetched" : "empty",
      reason: text ? "" : "링크에서 읽을 수 있는 텍스트가 비어 있습니다.",
      url: submittedUrl,
      contentType,
      text: truncateText(text),
    };
  } catch (error) {
    return {
      source: "url",
      status: "failed",
      reason: error.name === "AbortError" ? "링크 읽기 시간이 초과되었습니다." : error.message,
      url: submittedUrl,
      text: "",
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const extractSubmittedFileText = (submission) => {
  const fileData = String(submission?.submittedFileData || "");

  if (!fileData) {
    return null;
  }

  const match = fileData.match(/^data:([^;,]+)?(?:;[^,]*)?,(.*)$/);
  const contentType = String(submission?.submittedFileType || match?.[1] || "").toLowerCase();

  if (!isTextLike(contentType)) {
    return {
      source: "file",
      status: "skipped",
      reason: `텍스트로 읽을 수 없는 파일 형식입니다: ${contentType || "unknown"}`,
      fileName: submission?.submittedFileName || "",
      contentType,
      text: "",
    };
  }

  try {
    const encodedPayload = match?.[2] || "";
    const isBase64 = fileData.includes(";base64,");
    const text = isBase64
      ? Buffer.from(encodedPayload, "base64").toString("utf8")
      : decodeURIComponent(encodedPayload);

    return {
      source: "file",
      status: text ? "extracted" : "empty",
      reason: text ? "" : "파일에서 읽을 수 있는 텍스트가 비어 있습니다.",
      fileName: submission?.submittedFileName || "",
      contentType,
      text: truncateText(normalizeWhitespace(text)),
    };
  } catch (error) {
    return {
      source: "file",
      status: "failed",
      reason: error.message,
      fileName: submission?.submittedFileName || "",
      contentType,
      text: "",
    };
  }
};

export const collectSubmissionArtifactEvidence = async (submission) => {
  const [urlEvidence, fileEvidence] = await Promise.all([
    fetchSubmittedUrlText(submission?.submittedUrl),
    Promise.resolve(extractSubmittedFileText(submission)),
  ]);

  return [urlEvidence, fileEvidence].filter(Boolean);
};
