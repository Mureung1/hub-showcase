import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_LEVEL_DELAY_MS,
  getNudgeDelayMs,
  resolveNudgeMode,
} from "./nudgeConfig.js";
import { getLevelDelayMinutes, getUrgencyBucket } from "./nudgeInterval.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveNudgeMode", () => {
  it("테스트 환경(MODE==='test')이면 VITE_NUDGE_MODE/PROD와 무관하게 항상 demo다", () => {
    vi.stubEnv("MODE", "test");
    vi.stubEnv("VITE_NUDGE_MODE", "production");
    vi.stubEnv("PROD", true);

    expect(resolveNudgeMode()).toBe("demo");
  });

  it("VITE_NUDGE_MODE가 정확히 demo/production이면 그 값을 그대로 쓴다", () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("PROD", true);

    vi.stubEnv("VITE_NUDGE_MODE", "demo");
    expect(resolveNudgeMode()).toBe("demo");

    vi.stubEnv("VITE_NUDGE_MODE", "production");
    expect(resolveNudgeMode()).toBe("production");
  });

  it("VITE_NUDGE_MODE가 잘못된 값이면 경고 후 PROD 기준 기본값으로 돌아간다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("MODE", "production");
    vi.stubEnv("VITE_NUDGE_MODE", "turbo");
    vi.stubEnv("PROD", true);

    expect(resolveNudgeMode()).toBe("production");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("turbo"));

    warn.mockRestore();
  });

  it("환경변수가 없고 PROD===true면 production, 아니면 demo다", () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("VITE_NUDGE_MODE", "");
    vi.stubEnv("PROD", true);
    expect(resolveNudgeMode()).toBe("production");

    vi.stubEnv("PROD", false);
    expect(resolveNudgeMode()).toBe("demo");
  });
});

describe("getNudgeDelayMs", () => {
  it("레벨 1(다음 도달 레벨)은 어느 모드에서든 항상 즉시(0)다", () => {
    vi.stubEnv("MODE", "test");
    expect(getNudgeDelayMs(0, null)).toBe(0);
  });

  it("demo 모드에서는 DEMO_LEVEL_DELAY_MS 값을 그대로 반환한다(기존 동작 유지)", () => {
    vi.stubEnv("MODE", "test");
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 10); // far 구간

    expect(getNudgeDelayMs(1, deadline)).toBe(DEMO_LEVEL_DELAY_MS.far[2]);
    expect(getNudgeDelayMs(2, deadline)).toBe(DEMO_LEVEL_DELAY_MS.far[3]);
    expect(getNudgeDelayMs(3, deadline)).toBe(DEMO_LEVEL_DELAY_MS.far[4]);
  });

  it("production 모드에서는 nudgeInterval.ts의 분 단위 값을 ms로 변환해 반환한다", () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("VITE_NUDGE_MODE", "production");

    const now = new Date("2026-07-22T12:00:00");
    const deadline = new Date("2026-07-29T12:00:00"); // far 구간
    const bucket = getUrgencyBucket(deadline, now);

    expect(getNudgeDelayMs(1, deadline, now)).toBe(
      getLevelDelayMinutes(2, bucket) * 60_000,
    );
    expect(getNudgeDelayMs(2, deadline, now)).toBe(
      getLevelDelayMinutes(3, bucket) * 60_000,
    );
  });
});
