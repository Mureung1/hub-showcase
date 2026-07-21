/**
 * 문자(SMS/LMS) 발송 본문 조립 — FE 미리보기와 BE 실발송이 공유한다.
 * "미리보기 = 실제 발송" 일치를 위해 한 곳에 둔다.
 *
 * - 한국 LMS(EUC-KR)는 이모지를 못 실어 통신사가 떼어낸다 → **문자 경로에서만** 이모지를 제거한다.
 *   (SNS·대시보드 문구는 이모지를 유지 — 이 유틸은 문자 전용)
 * - 정보통신망법: (광고) 표기 · 전송자명 · 무료수신거부. 무료수신거부는 본문과 구분되게 빈 줄을 띄운다.
 */

/** 모의 무료수신거부 회선 (실회선 계약은 스코프 밖 — 문구 삽입만). BE(legal/filter)와 값이 일치해야 한다. */
export const DEFAULT_OPT_OUT_NUMBER = "080-123-4567";

// 그림문자 + 스킨톤 수정자 + 국기(지역표시자).
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}/gu;
// 변형선택자(U+FE0F)·ZWJ(U+200D) — 소스에 보이지 않는 리터럴을 넣지 않으려고 코드포인트로 구성.
const JOINER_RE = new RegExp(`[${String.fromCodePoint(0xfe0f, 0x200d)}]`, "gu");

/**
 * 문자에서 이모지를 제거하고, 그로 인해 생긴 연속 공백/빈 줄을 정리한다.
 * (copy 안의 이모지만 제거 — 조립된 본문의 의도된 빈 줄은 건드리지 않도록 copy 단계에서만 호출한다)
 */
export function stripEmoji(text: string): string {
  return text
    .replace(EMOJI_RE, "")
    .replace(JOINER_RE, "")
    .replace(/[^\S\n]+/g, " ") // 개행 제외 공백류 → 1칸
    .replace(/ *\n */g, "\n") // 줄 경계 공백 제거
    .replace(/\n{3,}/g, "\n\n") // 과도한 빈 줄 축소
    .trim();
}

export interface SmsBodyParams {
  /** LLM/사장님 문구 (이모지 포함 가능 — 문자용으로 여기서 제거한다). */
  copy: string;
  /** 전송자명(매장명). */
  storeName: string;
  /** 무료수신거부 번호. 생략 시 기본값. */
  optOutNumber?: string;
}

/**
 * 광고 문자 본문을 조립한다: (광고) 전송자명 + 이모지 제거된 copy + 빈 줄 뒤 무료수신거부.
 * BE(legal/filter.buildAdMessage)와 FE(발송 미리보기)가 동일 결과를 얻는다.
 */
export function buildSmsBody({
  copy,
  storeName,
  optOutNumber = DEFAULT_OPT_OUT_NUMBER,
}: SmsBodyParams): string {
  const cleanCopy = stripEmoji(copy);
  // 본문과 무료수신거부 사이 빈 줄 2줄(가독성).
  return `(광고) [${storeName}]\n${cleanCopy}\n\n\n무료수신거부 ${optOutNumber}`;
}
