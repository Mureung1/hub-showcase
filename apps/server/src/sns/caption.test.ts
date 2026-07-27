import { describe, it, expect } from "vitest";
import { buildSnsCaption, SNS_ATTRIBUTION, SNS_HASHTAGS } from "shared";

/**
 * 캡션은 서버 실게시(routes/campaigns)·FE 복사 폴백(SentView)·미리보기가 공유하는 단일 소스다.
 * 여기가 깨지면 "게시된 캡션 ≠ 복사되는 문구"가 되므로 조립 결과를 통째로 고정한다.
 */
describe("buildSnsCaption", () => {
  const params = {
    copy: "비 오는 오늘, 따뜻한 라떼 한 잔 어떠세요 ☕",
    promo: { type: "할인", value: "픽업 10% 할인" },
  };

  it("본문 → 혜택·귀속 블록 → 해시태그 순으로 조립한다", () => {
    expect(buildSnsCaption(params)).toBe(
      [
        "비 오는 오늘, 따뜻한 라떼 한 잔 어떠세요 ☕",
        "",
        "🎁 픽업 10% 할인",
        "📍 매장에서 이 게시물 보여주세요",
        "",
        "#날씨마케팅 #오늘의혜택 #동네가게",
      ].join("\n"),
    );
  });

  /**
   * SNS는 개인별 쿠폰 코드를 못 주므로(1:N 공개 채널) 귀속 안내가 유일한 전환 장치다.
   * 혜택만 있고 받는 법이 없으면 게시물을 본 손님이 매장에서 제시할 게 없다.
   */
  it("혜택 바로 다음 줄에 귀속 안내가 붙는다 (빈 줄로 떨어지지 않게)", () => {
    const lines = buildSnsCaption(params).split("\n");
    const offerAt = lines.findIndex((l) => l.startsWith("🎁"));
    expect(lines[offerAt + 1]).toBe(SNS_ATTRIBUTION);
  });

  it("해시태그는 캡션 마지막 줄에 온다", () => {
    const lines = buildSnsCaption(params).split("\n");
    expect(lines[lines.length - 1]).toBe(SNS_HASHTAGS.join(" "));
  });

  it("본문 앞뒤 공백은 잘라내되 이모지는 유지한다 (문자와 달리 SNS는 이모지 가능)", () => {
    const out = buildSnsCaption({ ...params, copy: "  오늘의 혜택 🎁  " });
    expect(out.startsWith("오늘의 혜택 🎁\n")).toBe(true);
  });

  it("할인율이 편집되면 혜택 줄에 그대로 반영된다", () => {
    const out = buildSnsCaption({ ...params, promo: { type: "할인", value: "픽업 20% 할인" } });
    expect(out).toContain("🎁 픽업 20% 할인");
  });
});
