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

const pendingValue = "분석 대기";

function createBriefField(value = "", status = "pending") {
  return {
    source: null,
    status,
    value: String(value ?? "").trim(),
  };
}

export function createNoticeBriefFromLink(link) {
  const announcementName = link.title || "제목 확인 필요";
  const fields = Object.fromEntries(
    noticeBriefFields.map((field) => [field.key, createBriefField()]),
  );

  fields.announcementName = createBriefField(announcementName, "ready");

  return {
    id: `brief:${link.id || link.url}`,
    sourceName: link.sourceName || link.hostname || "출처 미지정",
    sourceUrl: link.sourceUrl || "",
    status: "pending",
    statusLabel: pendingValue,
    title: announcementName,
    url: link.url,
    fields,
  };
}

export function createNoticeBriefsFromLinks(links = []) {
  return links.map(createNoticeBriefFromLink);
}

export function getNoticeBriefValue(brief, fieldKey) {
  return brief.fields?.[fieldKey]?.value || pendingValue;
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
