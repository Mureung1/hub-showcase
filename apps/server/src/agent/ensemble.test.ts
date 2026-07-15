import { describe, it, expect, vi } from "vitest";
import type { NormalizedWeather, WeatherCondition, WeatherSource } from "shared";
import { mergeWeather, getEnsembleWeather } from "./ensemble";

// 정규화 날씨 샘플 빌더
function w(
  source: WeatherSource,
  over: Partial<NormalizedWeather> = {},
): NormalizedWeather {
  return {
    source,
    baseDateTime: "2026-07-13T12:00",
    tempC: 20,
    humidity: 50,
    precipitationMm: 0,
    precipitationProb: 0,
    isPrecipitating: false,
    condition: "clear",
    ...over,
  };
}

describe("mergeWeather", () => {
  it("두 소스 기온을 0.6/0.4로 가중 평균한다", () => {
    const r = mergeWeather([w("kma", { tempC: 20 }), w("owm", { tempC: 30 })]);
    // 20*0.6 + 30*0.4 = 24
    expect(r.tempC).toBe(24);
    expect(r.sourceCount).toBe(2);
    expect(r.sources).toEqual(["kma", "owm"]);
  });

  it("강수 여부가 갈리면 보수적으로 강수를 채택한다", () => {
    const r = mergeWeather([
      w("kma", { isPrecipitating: true, condition: "rain", precipitationProb: 80 }),
      w("owm", { isPrecipitating: false, condition: "clear", precipitationProb: 0 }),
    ]);
    expect(r.isPrecipitating).toBe(true);
    expect(r.condition).toBe("rain"); // 가중치 큰 강수 소스(kma)
  });

  it("둘 다 강수면 가중치 큰 소스의 상태를 채택한다", () => {
    const r = mergeWeather([
      w("kma", { isPrecipitating: true, condition: "rain" }),
      w("owm", { isPrecipitating: true, condition: "shower" }),
    ]);
    expect(r.condition).toBe("rain");
  });

  it("둘 다 비강수면 더 궂은 하늘상태를 채택한다 (흐림 > 구름많음)", () => {
    const r = mergeWeather([
      w("kma", { condition: "cloudy" }),
      w("owm", { condition: "overcast" }),
    ]);
    expect(r.isPrecipitating).toBe(false);
    expect(r.condition).toBe("overcast");
  });

  it("강수확률·강수량은 보수적으로 max 채택한다", () => {
    const r = mergeWeather([
      w("kma", { precipitationProb: 60, precipitationMm: 2 }),
      w("owm", { precipitationProb: 40, precipitationMm: 5 }),
    ]);
    expect(r.precipitationProb).toBe(60); // max(60, 40)
    expect(r.precipitationMm).toBe(5); // max(2, 5)
  });

  it("강수확률이 결측(null)인 소스는 제외하고 남은 값을 쓴다", () => {
    const r = mergeWeather([
      w("kma", { precipitationProb: 20 }),
      w("owm", { precipitationProb: null }), // OWM은 POP 미제공
    ]);
    expect(r.precipitationProb).toBe(20); // 12%로 축소되지 않음
  });

  it("모든 소스의 강수확률이 결측이면 null (0으로 표기하지 않음)", () => {
    const r = mergeWeather([w("owm", { precipitationProb: null })]);
    expect(r.precipitationProb).toBeNull();
  });

  it("소스가 1개면 그 값을 그대로 반환한다 (폴백 대비)", () => {
    const r = mergeWeather([w("owm", { tempC: 27, condition: "overcast" as WeatherCondition })]);
    expect(r.tempC).toBe(27);
    expect(r.condition).toBe("overcast");
    expect(r.sourceCount).toBe(1);
    expect(r.sources).toEqual(["owm"]);
  });

  it("빈 배열이면 예외를 던진다", () => {
    expect(() => mergeWeather([])).toThrow(/소스가 없습니다/);
  });
});

describe("getEnsembleWeather (한쪽 소스 장애 폴백)", () => {
  const loc = { nx: 98, ny: 75, lat: 35.1578, lng: 129.0594 };
  const kmaOk = () => Promise.resolve(w("kma", { tempC: 30, precipitationProb: 20 }));
  const owmOk = () => Promise.resolve(w("owm", { tempC: 29, precipitationProb: null }));
  const fail = () => Promise.reject(new Error("network"));

  it("두 소스 모두 성공하면 2개로 병합한다", async () => {
    const r = await getEnsembleWeather(loc, { getKma: kmaOk, getOwm: owmOk });
    expect(r.sourceCount).toBe(2);
    expect(r.sources).toEqual(["kma", "owm"]);
  });

  it("기상청 실패 시 OWM 단독으로 진행하고, 강수확률은 null이 된다", async () => {
    const r = await getEnsembleWeather(loc, { getKma: fail, getOwm: owmOk });
    expect(r.sourceCount).toBe(1);
    expect(r.sources).toEqual(["owm"]);
    expect(r.precipitationProb).toBeNull(); // OWM은 POP 미제공 → 0으로 위조하지 않음
  });

  it("OWM 실패 시 기상청 단독으로 진행한다", async () => {
    const r = await getEnsembleWeather(loc, { getKma: kmaOk, getOwm: fail });
    expect(r.sourceCount).toBe(1);
    expect(r.sources).toEqual(["kma"]);
    expect(r.precipitationProb).toBe(20);
  });

  it("두 소스 모두 실패하면 예외를 던진다", async () => {
    const getKma = vi.fn(fail);
    const getOwm = vi.fn(fail);
    await expect(getEnsembleWeather(loc, { getKma, getOwm })).rejects.toThrow(/모든 날씨 소스 실패/);
    expect(getKma).toHaveBeenCalledTimes(1);
    expect(getOwm).toHaveBeenCalledTimes(1);
  });
});
