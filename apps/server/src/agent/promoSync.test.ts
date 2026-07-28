import { describe, it, expect } from "vitest";
import type { Proposal } from "shared";
import { syncPromoToCopy } from "./promoSync";

function proposal(over: Partial<Proposal> = {}): Proposal {
  return {
    title: "오늘의 픽업 혜택",
    copy: "☕ 오늘 픽업 주문 15% 할인해 드려요!",
    promo: { type: "할인", value: "픽업 15% 할인" },
    channels: ["dangol"],
    ...over,
  };
}

describe("syncPromoToCopy", () => {
  it("이미 일치하면 그대로 둔다", () => {
    const p = proposal();
    expect(syncPromoToCopy(p)).toEqual(p);
  });

  it("promo 할인율을 copy에 맞춘다 (실측 회귀: copy 15% / promo 21%)", () => {
    const p = proposal({ promo: { type: "할인", value: "픽업 21% 할인" } });
    expect(syncPromoToCopy(p).promo.value).toBe("픽업 15% 할인");
  });

  it("정액도 맞춘다", () => {
    const p = proposal({
      copy: "이 문자 보여주시면 세트 2,000원 할인 🎁",
      promo: { type: "할인", value: "따뜻한 세트 3,000원 할인" },
    });
    expect(syncPromoToCopy(p).promo.value).toBe("따뜻한 세트 2,000원 할인");
  });

  it("숫자만 바꾸고 설명은 남긴다", () => {
    const p = proposal({
      copy: "오늘 10% 할인!",
      promo: { type: "할인", value: "픽업 주문 15% 할인 (오늘 하루)" },
    });
    expect(syncPromoToCopy(p).promo.value).toBe("픽업 주문 10% 할인 (오늘 하루)");
  });

  it("할인과 무관한 숫자는 기준으로 삼지 않는다", () => {
    // "100% 아라비카"를 할인율로 읽으면 promo가 100%가 된다.
    const p = proposal({ copy: "100% 아라비카 원두로 만듭니다" });
    expect(syncPromoToCopy(p).promo.value).toBe("픽업 15% 할인");
  });

  it("혜택 형태가 다르면 건드리지 않는다 (되쓸 자리가 없다)", () => {
    const p = proposal({
      copy: "세트 2,000원 할인!",
      promo: { type: "할인", value: "픽업 15% 할인" },
    });
    expect(syncPromoToCopy(p).promo.value).toBe("픽업 15% 할인");
  });

  it("promo에 할인 표기가 없으면 그대로 둔다", () => {
    const p = proposal({ promo: { type: "증정", value: "아메리카노 증정" } });
    expect(syncPromoToCopy(p).promo.value).toBe("아메리카노 증정");
  });

  it("title·copy·channels는 건드리지 않는다", () => {
    const p = proposal({ promo: { type: "할인", value: "픽업 21% 할인" } });
    const out = syncPromoToCopy(p);
    expect(out.title).toBe(p.title);
    expect(out.copy).toBe(p.copy);
    expect(out.channels).toEqual(p.channels);
    expect(out.promo.type).toBe("할인");
  });
});
