import { ApiError } from "../utils/ApiError.js";
import { generateJson } from "./llmClient.js";

const GENERAL_TOPIC_LABELS = {
  atmosphere: "매장 분위기 · 인테리어",
  service: "서비스 · 직원 소개",
  location: "위치 · 오시는 길",
  "brand-story": "브랜드 스토리",
  etc: "기타",
};

const PROMOTION_SYSTEM_PROMPT = `당신은 소상공인 블로그에 올릴 홍보글을 쓰는 한국어 카피라이터 겸 SEO 담당자입니다.
- 친근하고 신뢰가 가는 톤으로, 과장이나 낚시성 문구 없이 자연스럽게 씁니다.
- 제공된 사실 정보(날짜, 이름, 기간 등)는 정확히 반영하고 임의로 바꾸지 않습니다.
- seoKeywords는 이 글이 검색에 노출되면 좋을 키워드 3~5개(# 없이), hashtags는 블로그에 함께 달 해시태그 3~6개(# 없이)입니다. 둘 다 본문 내용에 실제로 관련 있는 단어/구로만 만듭니다.`;

const PROMOTION_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    content: { type: "string" },
    seoKeywords: { type: "array", items: { type: "string" } },
    hashtags: { type: "array", items: { type: "string" } },
  },
  required: ["title", "content", "seoKeywords", "hashtags"],
  additionalProperties: false,
};

function requireFields(answers, fields) {
  const missing = fields.filter((field) => !answers[field]);
  if (missing.length > 0) {
    throw new ApiError(400, "MISSING_FIELDS", `다음 답변이 필요합니다: ${missing.join(", ")}`);
  }
}

async function buildNewMenuPost(answers) {
  requireFields(answers, ["menu-name", "launch-date"]);
  const menuName = answers["menu-name"];
  const launchDate = answers["launch-date"];

  const { title, content, seoKeywords, hashtags } = await generateJson({
    system: PROMOTION_SYSTEM_PROMPT,
    schema: PROMOTION_SCHEMA,
    user: `신메뉴 출시 홍보글을 써주세요.\n- 메뉴 이름: ${menuName}\n- 출시일: ${launchDate}`,
  });

  return { title, content, seoKeywords, hashtags, menuName, launchDate };
}

async function buildEventPost(answers) {
  requireFields(answers, ["event-name", "event-type", "event-detail", "event-period"]);
  const eventName = answers["event-name"];
  const eventType = answers["event-type"];
  const eventDetail = answers["event-detail"];
  const period = answers["event-period"] ?? {};

  if (!period.start || !period.end) {
    throw new ApiError(400, "MISSING_FIELDS", "event-period에는 start/end가 모두 필요합니다.");
  }

  const { title, content, seoKeywords, hashtags } = await generateJson({
    system: PROMOTION_SYSTEM_PROMPT,
    schema: PROMOTION_SCHEMA,
    user: `이벤트 홍보글을 써주세요.\n- 이벤트명: ${eventName}\n- 유형: ${eventType}\n- 상세 내용: ${eventDetail}\n- 기간: ${period.start} ~ ${period.end}`,
  });

  return {
    title,
    content,
    seoKeywords,
    hashtags,
    eventName,
    eventType,
    eventDetail,
    eventPeriodStart: period.start,
    eventPeriodEnd: period.end,
  };
}

async function buildGeneralPost(answers) {
  requireFields(answers, ["general-topic", "general-detail"]);
  const generalTopic = answers["general-topic"];
  const generalDetail = answers["general-detail"];
  const topicLabel = GENERAL_TOPIC_LABELS[generalTopic] ?? "매장";

  const { title, content, seoKeywords, hashtags } = await generateJson({
    system: PROMOTION_SYSTEM_PROMPT,
    schema: PROMOTION_SCHEMA,
    user: `"${topicLabel}" 주제로 홍보글을 써주세요.\n- 전달할 내용: ${generalDetail}`,
  });

  return { title, content, seoKeywords, hashtags, generalTopic, generalDetail };
}

export async function buildPromotionPost(answers) {
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

const NOTICE_TYPE_LABELS = {
  "day-off": "휴무 안내",
  "hours-change": "영업시간 변경 안내",
  "sold-out": "품절 안내",
  etc: "공지",
};

const NOTICE_SYSTEM_PROMPT = `당신은 소상공인 블로그의 공지사항을 정리하는 한국어 카피라이터입니다.
- 정중하고 명확한 톤으로, 고객이 헷갈리지 않게 핵심 정보를 앞에 배치합니다.
- 원문에 있는 날짜, 시간, 숫자 등 사실 정보는 절대 바꾸지 말고 그대로 반영합니다.
- seoKeywords는 이 공지와 관련해 검색에 노출되면 좋을 키워드 3~5개입니다(# 없이).`;

const NOTICE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    content: { type: "string" },
    seoKeywords: { type: "array", items: { type: "string" } },
  },
  required: ["title", "content", "seoKeywords"],
  additionalProperties: false,
};

export async function buildNoticePost(answers) {
  requireFields(answers, ["type", "content"]);
  const noticeType = answers.type;
  if (!NOTICE_TYPE_LABELS[noticeType]) {
    throw new ApiError(
      400,
      "INVALID_NOTICE_TYPE",
      "type은 day-off/hours-change/sold-out/etc 중 하나여야 합니다."
    );
  }

  const { title, content, seoKeywords } = await generateJson({
    system: NOTICE_SYSTEM_PROMPT,
    schema: NOTICE_SCHEMA,
    user: `"${NOTICE_TYPE_LABELS[noticeType]}" 공지 원문을 다듬어 써주세요.\n- 원문: ${answers.content}`,
  });

  return { title, content, seoKeywords, noticeType };
}
