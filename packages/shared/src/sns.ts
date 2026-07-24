/**
 * SNS(인스타그램) 게시 캡션 조립 — 서버 실게시·완료화면 복사 폴백·미리보기가 공유한다.
 * 한 곳에 둬서 "게시된 캡션 = 복사되는 문구" 일치를 보장한다(문자의 buildSmsBody와 같은 패턴).
 *
 * 문자(SMS)와 달리 SNS는 이모지를 실을 수 있어 stripEmoji를 하지 않는다.
 */

/** SNS 캡션 말미에 붙는 기본 해시태그. */
export const SNS_HASHTAGS = ["#날씨마케팅", "#오늘의혜택", "#동네가게"];

export interface SnsCaptionParams {
  /** 발송 문구(LLM/사장님 편집본). 이모지 유지. */
  copy: string;
  /** 프로모션 (예: { type: "할인", value: "픽업 10% 할인" }). */
  promo: { type: string; value: string };
}

/**
 * 인스타그램 게시용 캡션을 만든다: 본문 + 프로모 강조 줄 + 해시태그.
 * 서버(sns/instagram.publishToInstagram)와 FE(SentView 복사 버튼)가 동일 결과를 얻는다.
 */
export function buildSnsCaption({ copy, promo }: SnsCaptionParams): string {
  return `${copy.trim()}\n\n🎁 ${promo.value}\n\n${SNS_HASHTAGS.join(" ")}`;
}
