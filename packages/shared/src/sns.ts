/**
 * SNS(인스타그램) 게시 캡션 조립 — 서버 실게시·완료화면 복사 폴백·미리보기가 공유한다.
 * 한 곳에 둬서 "게시된 캡션 = 복사되는 문구" 일치를 보장한다(문자의 buildSmsBody와 같은 패턴).
 *
 * 문자(SMS)와 달리 SNS는 이모지를 실을 수 있어 stripEmoji를 하지 않는다.
 */

/** SNS 캡션 말미에 붙는 기본 해시태그. */
export const SNS_HASHTAGS = ["#날씨마케팅", "#오늘의혜택", "#동네가게"];

/**
 * 오프라인 귀속 안내 — 혜택 다음 줄에 붙는다.
 *
 * SNS는 1:N 공개 채널이라 개인별 쿠폰 코드를 줄 수 없다(문자는 동의 단골 목록이 있어
 * 1인 1코드 발급 → 코드로 전환 측정). 코드가 없으면 게시물을 본 손님이 매장에서
 * 제시할 게 없어 전환 경로 자체가 끊긴다. 그래서 코드 대신 "게시물 화면"을 증표로 쓴다.
 * 사장님이 눈으로 확인 가능하고, 채널(인스타·X)과 무관하게 통한다.
 */
export const SNS_ATTRIBUTION = "📍 매장에서 이 게시물 보여주세요";

export interface SnsCaptionParams {
  /** 발송 문구(LLM/사장님 편집본). 이모지 유지. */
  copy: string;
  /** 프로모션 (예: { type: "할인", value: "픽업 10% 할인" }). */
  promo: { type: string; value: string };
}

/**
 * 인스타그램 게시용 캡션을 만든다: 본문 + 혜택·귀속 블록 + 해시태그.
 * 서버(sns/instagram.publishToInstagram)와 FE(SentView 복사 버튼)가 동일 결과를 얻는다.
 *
 * 혜택(🎁)과 받는 법(📍)은 빈 줄 없이 붙여 한 블록으로 읽히게 한다 —
 * "얼마 할인"과 "어떻게 받나"가 떨어지면 손님이 후자를 놓친다.
 */
export function buildSnsCaption({ copy, promo }: SnsCaptionParams): string {
  const offer = `🎁 ${promo.value}\n${SNS_ATTRIBUTION}`;
  return `${copy.trim()}\n\n${offer}\n\n${SNS_HASHTAGS.join(" ")}`;
}
