import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveDemoWeather, DEMO_WEATHER_KEYS } from "./demoWeather";
import { getEnsembleWeather } from "./ensemble";

/**
 * 데모 고정 날씨(5-1). 발표 당일 실제 날씨가 맑으면 "매출 방어" 서사가 성립하지 않아
 * 날씨 입력만 고정한다. 기본은 꺼짐 — 평상시 실연동을 건드리면 안 된다.
 */
describe("resolveDemoWeather", () => {
  afterEach(() => {
    delete process.env.DEMO_WEATHER;
    vi.restoreAllMocks();
  });

  it("미설정이면 null (실 API 사용)", () => {
    expect(resolveDemoWeather(undefined)).toBeNull();
  });

  it("빈 문자열·공백이면 null — 환경변수를 비워 끄는 게 통해야 한다", () => {
    expect(resolveDemoWeather("")).toBeNull();
    expect(resolveDemoWeather("   ")).toBeNull();
  });

  it("rain이면 강수 + seeded 표식이 붙는다", () => {
    const w = resolveDemoWeather("rain");
    expect(w).not.toBeNull();
    expect(w?.condition).toBe("rain");
    expect(w?.isPrecipitating).toBe(true);
    expect(w?.seeded).toBe(true);
  });

  it("대소문자·앞뒤 공백을 허용한다 (환경변수 오타 방어)", () => {
    expect(resolveDemoWeather(" RAIN ")?.condition).toBe("rain");
  });

  /** 실 API를 안 썼다는 사실이 값에 남아야 화면 배지가 '소스 평균'으로 속이지 않는다. */
  it("모든 프리셋이 sources 빈 배열·sourceCount 0·seeded true", () => {
    for (const key of DEMO_WEATHER_KEYS) {
      const w = resolveDemoWeather(key);
      expect(w?.sources).toEqual([]);
      expect(w?.sourceCount).toBe(0);
      expect(w?.seeded).toBe(true);
    }
  });

  it("모르는 값이면 경고를 남기고 null — 발표 직전 오타를 조용히 삼키지 않는다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveDemoWeather("rainy")).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("DEMO_WEATHER");
  });

  it("프리셋을 고쳐도 다음 호출에 새 값이 나온다 (복사본 반환)", () => {
    const first = resolveDemoWeather("rain");
    first!.tempC = 999;
    expect(resolveDemoWeather("rain")?.tempC).not.toBe(999);
  });

  it("환경변수에서도 읽는다", () => {
    process.env.DEMO_WEATHER = "cold";
    expect(resolveDemoWeather()?.condition).toBe("snow");
  });
});

describe("getEnsembleWeather — 데모 seed 분기", () => {
  const loc = { nx: 62, ny: 125, lat: 37.36, lng: 127.11 };

  it("seed가 켜져 있으면 실 API를 아예 부르지 않는다", async () => {
    const getKma = vi.fn();
    const getOwm = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const w = await getEnsembleWeather(loc, {
      getKma,
      getOwm,
      demoWeather: () => resolveDemoWeather("rain"),
    });

    expect(w.seeded).toBe(true);
    expect(w.condition).toBe("rain");
    expect(getKma).not.toHaveBeenCalled();
    expect(getOwm).not.toHaveBeenCalled();
  });

  it("seed가 없으면 평소대로 두 소스를 병합한다 (기본 경로 회귀 방지)", async () => {
    const base = {
      baseDateTime: "2026-07-31T09:00",
      humidity: 50,
      precipitationMm: 0,
      precipitationProb: 0,
      isPrecipitating: false,
      condition: "clear" as const,
    };
    const w = await getEnsembleWeather(loc, {
      getKma: async () => ({ ...base, source: "kma" as const, tempC: 20 }),
      getOwm: async () => ({ ...base, source: "owm" as const, tempC: 25 }),
      demoWeather: () => null,
    });

    expect(w.seeded).toBeUndefined();
    expect(w.sourceCount).toBe(2);
    expect(w.tempC).toBe(22); // 20*0.6 + 25*0.4
  });
});
