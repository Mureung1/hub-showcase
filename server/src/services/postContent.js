import { ApiError } from "../utils/ApiError.js";

// LLM 연동 전(Day10~11) 임시 규칙 기반 생성. 문장 틀에 답변을 끼워 넣는
// 최소 뼈대 수준으로만 구현한다 — 완성도는 LLM이 붙을 때 다듬는다.
const GENERAL_TOPIC_LABELS = {
  atmosphere: "매장 분위기 · 인테리어",
  service: "서비스 · 직원 소개",
  location: "위치 · 오시는 길",
  "brand-story": "브랜드 스토리",
  etc: "기타",
};

function requireFields(answers, fields) {
  const missing = fields.filter((field) => !answers[field]);
  if (missing.length > 0) {
    throw new ApiError(400, "MISSING_FIELDS", `다음 답변이 필요합니다: ${missing.join(", ")}`);
  }
}

function buildNewMenuPost(answers) {
  requireFields(answers, ["menu-name", "launch-date"]);
  const menuName = answers["menu-name"];
  const launchDate = answers["launch-date"];

  return {
    title: `${menuName} 출시 안내`,
    content: `신메뉴 "${menuName}"을 ${launchDate}부터 만나보실 수 있습니다.`,
    menuName,
    launchDate,
  };
}

function buildEventPost(answers) {
  requireFields(answers, ["event-name", "event-type", "event-detail", "event-period"]);
  const eventName = answers["event-name"];
  const eventType = answers["event-type"];
  const eventDetail = answers["event-detail"];
  const period = answers["event-period"] ?? {};

  if (!period.start || !period.end) {
    throw new ApiError(400, "MISSING_FIELDS", "event-period에는 start/end가 모두 필요합니다.");
  }

  return {
    title: eventName,
    content: `${eventDetail}\n기간: ${period.start} ~ ${period.end}`,
    eventName,
    eventType,
    eventDetail,
    eventPeriodStart: period.start,
    eventPeriodEnd: period.end,
  };
}

function buildGeneralPost(answers) {
  requireFields(answers, ["general-topic", "general-detail"]);
  const generalTopic = answers["general-topic"];
  const generalDetail = answers["general-detail"];

  return {
    title: `${GENERAL_TOPIC_LABELS[generalTopic] ?? "매장"} 소식`,
    content: generalDetail,
    generalTopic,
    generalDetail,
  };
}

export function buildPromotionPost(answers) {
  switch (answers.purpose) {
    case "new-menu":
      return buildNewMenuPost(answers);
    case "event":
      return buildEventPost(answers);
    case "general":
      return buildGeneralPost(answers);
    default:
      throw new ApiError(400, "INVALID_PURPOSE", "purpose는 new-menu/event/general 중 하나여야 합니다.");
  }
}
