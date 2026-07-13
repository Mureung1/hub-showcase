import { MATCH_STATUS_LABELS } from "../constants/opportunity.js";

export const noticeBriefFields = [
  { key: "announcementName", label: "공고명" },
  { key: "hostOrganization", label: "주최 기관" },
  { key: "deadline", label: "마감일" },
  { key: "eligibility", label: "지원 대상" },
  { key: "preferredConditions", label: "우대 조건" },
  { key: "requiredDocuments", label: "제출 서류" },
  { key: "benefits", label: "혜택" },
  { key: "activityPeriod", label: "활동 기간" },
];

const emptyValueLabels = {
  analyzing: "분석 중",
  complete: "확인 필요",
  error: "분석 실패",
  pending: "분석 대기",
};

function createBriefField(value = "", status = "pending", source = null) {
  return {
    source,
    status,
    value: String(value ?? "").trim(),
  };
}

function joinValues(values = []) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim())))
    .map((value) => value.trim())
    .join(", ");
}

function createBaseBrief(link, status = "pending") {
  const announcementName = link.title || "제목 확인 필요";
  const fields = Object.fromEntries(
    noticeBriefFields.map((field) => [field.key, createBriefField("", status)]),
  );

  fields.announcementName = createBriefField(announcementName, "ready", "scan");

  return {
    errorMessage: "",
    id: `brief:${link.id || link.url}`,
    mode: null,
    sourceName: link.sourceName || link.hostname || "출처 미지정",
    sourceUrl: link.sourceUrl || "",
    status,
    statusLabel: emptyValueLabels[status] || emptyValueLabels.pending,
    summary: "",
    title: announcementName,
    uncertainFields: [],
    url: link.url,
    fields,
  };
}

export function createNoticeBriefFromAnalysis(link, result) {
  const opportunity = result.opportunity;
  const match = result.match;
  const brief = createBaseBrief(link, "complete");
  const eligibility = opportunity.target || joinValues(
    opportunity.eligibility.map((item) => item.condition),
  );
  const scoreLabel = match.score === null ? "" : ` · ${match.score}점`;

  brief.mode = result.mode;
  brief.statusLabel = `${MATCH_STATUS_LABELS[match.status]}${scoreLabel}`;
  brief.summary = match.summary;
  brief.title = opportunity.title || link.title || "공고명 확인 필요";
  brief.url = opportunity.sourceUrl || link.url;
  brief.uncertainFields = opportunity.uncertainFields;
  brief.fields = {
    announcementName: createBriefField(opportunity.title, "complete", "analysis"),
    hostOrganization: createBriefField(opportunity.organizer, "complete", "analysis"),
    deadline: createBriefField(opportunity.deadline, "complete", "analysis"),
    eligibility: createBriefField(eligibility, "complete", "analysis"),
    preferredConditions: createBriefField(
      joinValues(opportunity.preferred.map((item) => item.condition)),
      "complete",
      "analysis",
    ),
    requiredDocuments: createBriefField(
      joinValues(opportunity.requiredDocuments),
      "complete",
      "analysis",
    ),
    benefits: createBriefField(joinValues(opportunity.benefits), "complete", "analysis"),
    activityPeriod: createBriefField(opportunity.activityPeriod, "complete", "analysis"),
  };

  return brief;
}

export function createNoticeBriefFromLink(link, analysisEntry) {
  if (analysisEntry?.status === "complete" && analysisEntry.result) {
    return createNoticeBriefFromAnalysis(link, analysisEntry.result);
  }

  const status = analysisEntry?.status === "analyzing" || analysisEntry?.status === "error"
    ? analysisEntry.status
    : "pending";
  const brief = createBaseBrief(link, status);

  if (status === "error") {
    brief.errorMessage = analysisEntry.errorMessage || "공지 분석 중 오류가 발생했습니다.";
  }

  return brief;
}

export function createNoticeBriefsFromLinks(links = [], analysisByUrl = {}) {
  return links.map((link) => createNoticeBriefFromLink(link, analysisByUrl[link.url]));
}

export function getNoticeBriefValue(brief, fieldKey) {
  return brief.fields?.[fieldKey]?.value || emptyValueLabels[brief.status] || emptyValueLabels.pending;
}

export function createNoticeAnalysisPayload(link, noticeHtml = "") {
  return {
    input: {
      html: noticeHtml,
      sourceName: link.sourceName || "",
      title: link.title || "",
      url: link.url,
    },
    outputSchema: noticeBriefFields.map((field) => ({
      key: field.key,
      label: field.label,
      type: "string",
    })),
  };
}
