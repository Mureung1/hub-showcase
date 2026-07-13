import { describe, it, expect, vi } from "vitest";
import {
  pickBaseDateTime,
  parseKmaResponse,
  getKmaWeather,
  parseOwmResponse,
  getOwmWeather,
} from "./weather";

// 기상청 응답 샘플 빌더 (한 슬롯 20260713 1400)
function kmaJson(
  values: Record<string, string>,
  resultCode = "00",
): unknown {
  const item = Object.entries(values).map(([category, fcstValue]) => ({
    category,
    fcstDate: "20260713",
    fcstTime: "1400",
    fcstValue,
  }));
  return {
    response: {
      header: { resultCode, resultMsg: resultCode === "00" ? "NORMAL_SERVICE" : "ERROR" },
      body: { items: { item } },
    },
  };
}

function okResponse(json: unknown): Response {
  return { ok: true, json: async () => json } as unknown as Response;
}

describe("pickBaseDateTime", () => {
  it("14:30 → 당일 1400 발표분", () => {
    expect(pickBaseDateTime(new Date(2026, 6, 13, 14, 30))).toEqual({
      baseDate: "20260713",
      baseTime: "1400",
    });
  });

  it("02:05 → 발표+10분 전이라 전날 2300 발표분", () => {
    expect(pickBaseDateTime(new Date(2026, 6, 13, 2, 5))).toEqual({
      baseDate: "20260712",
      baseTime: "2300",
    });
  });

  it("02:15 → 당일 0200 발표분", () => {
    expect(pickBaseDateTime(new Date(2026, 6, 13, 2, 15))).toEqual({
      baseDate: "20260713",
      baseTime: "0200",
    });
  });

  it("00:30 → 전날 2300 발표분", () => {
    expect(pickBaseDateTime(new Date(2026, 6, 13, 0, 30))).toEqual({
      baseDate: "20260712",
      baseTime: "2300",
    });
  });
});

describe("parseKmaResponse", () => {
  it("맑음 슬롯을 정규화한다", () => {
    const w = parseKmaResponse(
      kmaJson({ TMP: "24", REH: "40", POP: "0", PTY: "0", SKY: "1", PCP: "강수없음" }),
    );
    expect(w).toMatchObject({
      source: "kma",
      baseDateTime: "2026-07-13T14:00",
      tempC: 24,
      humidity: 40,
      precipitationMm: 0,
      precipitationProb: 0,
      isPrecipitating: false,
      condition: "clear",
    });
  });

  it("비 슬롯을 정규화한다 (PTY=1, PCP 파싱)", () => {
    const w = parseKmaResponse(
      kmaJson({ TMP: "18", REH: "85", POP: "80", PTY: "1", SKY: "4", PCP: "6.0mm" }),
    );
    expect(w).toMatchObject({
      tempC: 18,
      precipitationMm: 6,
      precipitationProb: 80,
      isPrecipitating: true,
      condition: "rain",
    });
  });

  it("resultCode가 00이 아니면 예외", () => {
    expect(() => parseKmaResponse(kmaJson({ TMP: "1" }, "03"))).toThrow(/기상청 응답 오류/);
  });
});

describe("getKmaWeather (타임아웃·재시도)", () => {
  const sample = kmaJson({ TMP: "24", REH: "40", POP: "0", PTY: "0", SKY: "1", PCP: "강수없음" });
  const deps = (fetchFn: typeof fetch, extra: Record<string, unknown> = {}) => ({
    serviceKey: "TEST_KEY",
    now: () => new Date(2026, 6, 13, 14, 30),
    fetchFn,
    ...extra,
  });

  it("정상 응답이면 정규화 결과를 반환한다", async () => {
    const fetchFn = vi.fn(async () => okResponse(sample)) as unknown as typeof fetch;
    const w = await getKmaWeather(98, 75, deps(fetchFn));
    expect(w.condition).toBe("clear");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("첫 호출 실패 시 1회 재시도 후 성공한다", async () => {
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls++;
      if (calls === 1) throw new Error("network");
      return okResponse(sample);
    }) as unknown as typeof fetch;
    const w = await getKmaWeather(98, 75, deps(fetchFn));
    expect(w.tempC).toBe(24);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("재시도까지 모두 실패하면 예외를 던진다", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    await expect(getKmaWeather(98, 75, deps(fetchFn))).rejects.toThrow(/network/);
    expect(fetchFn).toHaveBeenCalledTimes(2); // 최초 1 + 재시도 1
  });

  it("타임아웃(3초 초과)이면 abort 후 재시도하고 실패한다", async () => {
    const hanging = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    ) as unknown as typeof fetch;
    await expect(
      getKmaWeather(98, 75, deps(hanging, { timeoutMs: 20 })),
    ).rejects.toThrow(/aborted/);
    expect(hanging).toHaveBeenCalledTimes(2);
  });

  it("serviceKey가 없으면 예외", async () => {
    const fetchFn = vi.fn(async () => okResponse(sample)) as unknown as typeof fetch;
    await expect(
      getKmaWeather(98, 75, { serviceKey: "", fetchFn, now: () => new Date(2026, 6, 13, 14, 30) }),
    ).rejects.toThrow(/KMA_SERVICE_KEY/);
  });
});

// OWM current weather 응답 샘플 빌더
function owmJson(
  weatherId: number,
  main: { temp: number; humidity: number },
  extra: Record<string, unknown> = {},
): unknown {
  return {
    cod: 200,
    dt: 1_768_300_800, // 2026-01-13T10:40:00Z (결정적 UTC)
    weather: [{ id: weatherId }],
    main,
    ...extra,
  };
}

describe("parseOwmResponse", () => {
  it("맑음(800)을 정규화한다", () => {
    const w = parseOwmResponse(owmJson(800, { temp: 24.6, humidity: 40 }));
    expect(w).toMatchObject({
      source: "owm",
      tempC: 24.6,
      humidity: 40,
      precipitationMm: 0,
      precipitationProb: null, // OWM current weather는 POP 미제공
      isPrecipitating: false,
      condition: "clear",
    });
    expect(w.baseDateTime).toBe("2026-01-13T10:40");
  });

  it("비(500) + rain.1h 강수량을 정규화한다", () => {
    const w = parseOwmResponse(
      owmJson(500, { temp: 18, humidity: 88 }, { rain: { "1h": 2.5 } }),
    );
    expect(w).toMatchObject({
      condition: "rain",
      precipitationMm: 2.5,
      isPrecipitating: true,
    });
  });

  it("구름많음(801)/흐림(804)을 구분한다", () => {
    expect(parseOwmResponse(owmJson(801, { temp: 20, humidity: 50 })).condition).toBe("cloudy");
    expect(parseOwmResponse(owmJson(804, { temp: 20, humidity: 50 })).condition).toBe("overcast");
  });

  it("눈(600)/진눈깨비(611)를 구분한다", () => {
    expect(parseOwmResponse(owmJson(600, { temp: -2, humidity: 70 })).condition).toBe("snow");
    expect(parseOwmResponse(owmJson(611, { temp: 1, humidity: 80 })).condition).toBe("sleet");
  });

  it("cod가 200이 아니면 예외", () => {
    expect(() => parseOwmResponse({ cod: 401, message: "Invalid API key" })).toThrow(/OWM 응답 오류/);
  });
});

describe("getOwmWeather (타임아웃·재시도)", () => {
  const sample = owmJson(800, { temp: 24, humidity: 40 });
  const owmDeps = (fetchFn: typeof fetch, extra: Record<string, unknown> = {}) => ({
    apiKey: "TEST_KEY",
    fetchFn,
    ...extra,
  });

  it("정상 응답이면 정규화 결과를 반환한다", async () => {
    const fetchFn = vi.fn(async () => okResponse(sample)) as unknown as typeof fetch;
    const w = await getOwmWeather(35.1578, 129.0594, owmDeps(fetchFn));
    expect(w.condition).toBe("clear");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("첫 호출 실패 시 1회 재시도 후 성공한다", async () => {
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls++;
      if (calls === 1) throw new Error("network");
      return okResponse(sample);
    }) as unknown as typeof fetch;
    const w = await getOwmWeather(35.1578, 129.0594, owmDeps(fetchFn));
    expect(w.tempC).toBe(24);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("apiKey가 없으면 예외", async () => {
    const fetchFn = vi.fn(async () => okResponse(sample)) as unknown as typeof fetch;
    await expect(
      getOwmWeather(35.1578, 129.0594, { apiKey: "", fetchFn }),
    ).rejects.toThrow(/OWM_API_KEY/);
  });
});
