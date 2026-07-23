import type { ContextAnalysisResultV2 } from "../types/context";
import type { PublicContextAnalysisResult, ShareDisclosureMode } from "../types/platform";

export function sanitizeSharedResultForRender(
  result: ContextAnalysisResultV2 | PublicContextAnalysisResult,
  options: {
    disclosureMode: ShareDisclosureMode;
    includeProjectTitle: boolean;
    projectTitle?: string | null;
  },
): PublicContextAnalysisResult {
  const names = collectParticipantNames(result);
  const projectTitle = String(options.projectTitle || result.projectTitle || "").trim();
  const sanitized = sanitizeValue(result, {
    ...options,
    names,
    projectTitle,
  }) as Record<string, unknown>;

  return {
    ...sanitized,
    projectTitle: options.includeProjectTitle
      ? String(sanitized.projectTitle || projectTitle || "공유된 분석")
      : "공유 프로젝트",
    participants: [],
    participantAgents: {
      views: [],
      agreementPoints: [],
      tensionPoints: [],
      privacyNote: "공유본에서는 참여자 관점을 공개하지 않습니다.",
    },
  } as unknown as PublicContextAnalysisResult;
}

function sanitizeValue(
  value: unknown,
  options: {
    disclosureMode: ShareDisclosureMode;
    includeProjectTitle: boolean;
    projectTitle: string;
    names: string[];
  },
  parentKey = "",
): unknown {
  if (typeof value === "string") {
    let safeValue = !options.includeProjectTitle && options.projectTitle
      ? value.split(options.projectTitle).join("공유 프로젝트")
      : value;
    if (options.disclosureMode === "evidence" && parentKey === "quote") return safeValue;
    options.names.forEach((name, index) => {
      safeValue = safeValue.split(name).join(`참여자 ${index + 1}`);
    });
    return safeValue;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, options, parentKey));
  }
  if (!value || typeof value !== "object") return value;

  const blocked = new Set([
    "analysisRunId",
    "inputTokens",
    "latencyMs",
    "model",
    "outputTokens",
    "participantAgents",
    "participants",
    "projectId",
    "provider",
    "providerModel",
    "runId",
    "sourceIds",
    "sourceRecordId",
  ]);
  if (options.disclosureMode === "summary") {
    blocked.add("evidence");
    blocked.add("quote");
    blocked.add("sourceTitle");
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blocked.has(key))
      .map(([key, item]) => [key, sanitizeValue(item, options, key)]),
  );
}

function collectParticipantNames(result: ContextAnalysisResultV2 | PublicContextAnalysisResult) {
  const values = [
    ...(Array.isArray(result.participants) ? result.participants : []),
    ...(Array.isArray(result.participantAgents?.views) ? result.participantAgents.views : []),
  ];
  return [...new Set(
    values
      .map((item) => String(item?.actor || "").trim())
      .filter((name) => name.length >= 2 && name.length <= 80),
  )].sort((left, right) => right.length - left.length);
}
