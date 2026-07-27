import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NormalizedWeather, WeatherCondition, WeatherSource } from "shared";
import { mergeWeather, getEnsembleWeather, clearWeatherCache } from "./ensemble";

// 앙상블 결과가 5분 캐시되므로, 같은 loc을 쓰는 테스트끼리 서로 오염된다 → 매번 비운다.
beforeEach(() => clearWeatherCache());

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
  it("두 소스 기온을 0.7/0.3으로 가중 평균한다 (기상청 우선)", () => {
    const r = mergeWeather([w("kma", { tempC: 20 }), w("owm", { tempC: 30 })]);
    // 20*0.7 + 30*0.3 = 23
    expect(r.tempC).toBe(23);
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

/**
 * 5분 캐시. 기상청 왕복이 1979~4292ms라 대시보드 로딩 시간을 그대로 차지했다.
 * 단기예보는 3시간 슬롯이라 5분 안엔 어차피 같은 값 — 정확도 손실 없이 왕복만 줄인다.
 */
describe("getEnsembleWeather (5분 캐시)", () => {
  const loc = { nx: 62, ny: 122, lat: 37.3595, lng: 127.1052 };
  const sample = () => ({
    getKma: vi.fn(() => Promise.resolve(w("kma", { tempC: 30 }))),
    getOwm: vi.fn(() => Promise.resolve(w("owm", { tempC: 20 }))),
  });

  it("두 번째 호출은 API를 다시 부르지 않고 같은 값을 준다", async () => {
    const { getKma, getOwm } = sample();
    const first = await getEnsembleWeather(loc, { getKma, getOwm, now: () => 1000 });
    const second = await getEnsembleWeather(loc, { getKma, getOwm, now: () => 1000 });

    expect(second).toEqual(first);
    expect(getKma).toHaveBeenCalledTimes(1); // 재호출 없음
    expect(getOwm).toHaveBeenCalledTimes(1);
  });

  it("5분이 지나면 다시 부른다", async () => {
    const { getKma, getOwm } = sample();
    await getEnsembleWeather(loc, { getKma, getOwm, now: () => 0 });
    await getEnsembleWeather(loc, { getKma, getOwm, now: () => 5 * 60 * 1000 + 1 });

    expect(getKma).toHaveBeenCalledTimes(2);
  });

  it("좌표가 다르면 캐시를 공유하지 않는다", async () => {
    const { getKma, getOwm } = sample();
    await getEnsembleWeather(loc, { getKma, getOwm, now: () => 0 });
    await getEnsembleWeather({ ...loc, nx: 99 }, { getKma, getOwm, now: () => 0 });

    expect(getKma).toHaveBeenCalledTimes(2);
  });

  it("실패는 캐시하지 않는다 — 다음 요청이 곧바로 재시도할 수 있어야 한다", async () => {
    const down = () => Promise.reject(new Error("network"));
    const getOwm = vi.fn(() => Promise.resolve(w("owm", { tempC: 20 })));

    await expect(
      getEnsembleWeather(loc, { getKma: down, getOwm: down, now: () => 0 }),
    ).rejects.toThrow();

    const r = await getEnsembleWeather(loc, { getKma: down, getOwm, now: () => 0 });
    expect(r.sourceCount).toBe(1); // 캐시된 실패에 막히지 않고 재시도됨
    expect(getOwm).toHaveBeenCalledTimes(1);
  });

  it("반환값을 고쳐도 캐시가 오염되지 않는다", async () => {
    const { getKma, getOwm } = sample();
    const first = await getEnsembleWeather(loc, { getKma, getOwm, now: () => 0 });
    first.tempC = 999;

    const second = await getEnsembleWeather(loc, { getKma, getOwm, now: () => 0 });
    expect(second.tempC).not.toBe(999);
  });

  it("데모 고정 날씨는 캐시보다 먼저 적용된다 (seed를 켠 즉시 반영)", async () => {
    const { getKma, getOwm } = sample();
    await getEnsembleWeather(loc, { getKma, getOwm, now: () => 0 }); // 캐시 채우기

    const seeded = await getEnsembleWeather(loc, {
      getKma,
      getOwm,
      now: () => 0,
      demoWeather: () => ({
        tempC: 18, humidity: 85, precipitationMm: 6, precipitationProb: 80,
        isPrecipitating: true, condition: "rain", sources: [], sourceCount: 0, seeded: true,
      }),
    });

    expect(seeded.seeded).toBe(true);
    expect(seeded.tempC).toBe(18);
  });
});
