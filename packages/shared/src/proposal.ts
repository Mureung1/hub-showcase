/**
 * LLM이 생성하는 마케팅 제안.
 * 2-2 초안 단계라 느슨하다. 엄격한 검증(zod)·가드레일은 2-3, 2-4에서 붙인다.
 */
export interface Proposal {
  /** 캠페인 제목. */
  title: string;
  /** 문자/SNS 발송 문구. */
  copy: string;
  /** 프로모션 (예: { type: "할인", value: "10% 할인" }). */
  promo: {
    type: string;
    value: string;
  };
  /** 추천 발송 채널 (instagram·x·dangol 등). 초안이라 string[]로 받는다. */
  channels: string[];
}
