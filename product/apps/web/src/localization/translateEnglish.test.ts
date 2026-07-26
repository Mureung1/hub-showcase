import { describe, expect, it } from "vitest";

import { translateEnglishText } from "./translateEnglish";

describe("translateEnglishText", () => {
  it("translates core market-analysis labels and dynamic periods", () => {
    expect(translateEnglishText("연남 · 카페 · 2025년 1분기 기준")).toBe(
      "Yeonnam · Cafe · 2025 Q1",
    );
  });

  it("translates public-data metrics without changing the numeric value", () => {
    expect(translateEnglishText("유동 1,013,523명/분기 · 순증 +2")).toBe(
      "Foot traffic 1,013,523 people/quarter · Net change +2",
    );
  });

  it("translates category-specific metric guidance", () => {
    expect(translateEnglishText("카페에서 먼저 볼 지표 · 손님이 움직이는 시간")).toBe(
      "Cafe — key indicators to review · When customers are active",
    );
  });

  it("translates the competition legend without mixed Korean labels", () => {
    expect(translateEnglishText("동일 업종 · 선택 업종과 같은 점포만 집계합니다.")).toBe(
      "Same category · Counts only stores in the selected category.",
    );
  });

  it("translates map, ranking, and background-population labels", () => {
    expect(translateEnglishText("동일 업종 밀도 · 지표별 순위 · 시간대별 활동성")).toBe(
      "Same-category density · Metric rankings · Activity by time of day",
    );
    expect(translateEnglishText("서울 길단위인구가 제공하는 6개 시간 구간입니다.")).toBe(
      "Six time intervals from Seoul street-level population data.",
    );
    expect(translateEnglishText("KOSIS 주민등록인구 · 20251 · 과거 기준 · 행정동")).toBe(
      "KOSIS resident registration population · 2025 Q1 · Historical reference · Administrative district",
    );
    expect(translateEnglishText("점수의 근거와 읽는 법")).toBe(
      "How to read this score",
    );
  });

  it("translates dynamic summary and ranking values", () => {
    expect(
      translateEnglishText("분석 요약 · 유동 수요 peer 백분위가 70로 높아 긍정적입니다."),
    ).toBe(
      "Analysis summary · Foot-traffic demand has a high peer percentile (70), a positive signal.",
    );
    expect(translateEnglishText("점포당 추정매출 peer 백분위가 67로 높아 긍정적입니다.")).toBe(
      "Estimated sales per store has a high peer percentile (67), a positive signal.",
    );
    expect(translateEnglishText("3/31위 · 3개 동 중 3위")).toBe("#3 of 31 · #3 of 3 districts");
  });
});
