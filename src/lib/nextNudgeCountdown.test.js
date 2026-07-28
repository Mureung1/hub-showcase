import { describe, expect, it } from "vitest";
import { formatNextNudgeCountdown } from "./nextNudgeCountdown.js";

describe("formatNextNudgeCountdown", () => {
  it("1분 이상 남으면 MM:SS 형식을 반환한다 (happy path)", () => {
    expect(formatNextNudgeCountdown(4 * 60 * 1000 + 32 * 1000)).toBe(
      "다음 알림까지 04:32",
    );
    expect(formatNextNudgeCountdown(65 * 1000)).toBe("다음 알림까지 01:05");
  });

  it("정확히 60초면 MM:SS(01:00)로 표시한다 (경계)", () => {
    expect(formatNextNudgeCountdown(60 * 1000)).toBe("다음 알림까지 01:00");
  });

  it("6~59초는 N초로 표시한다", () => {
    expect(formatNextNudgeCountdown(42 * 1000)).toBe("다음 알림까지 42초");
    expect(formatNextNudgeCountdown(59 * 1000)).toBe("다음 알림까지 59초");
    expect(formatNextNudgeCountdown(6 * 1000)).toBe("다음 알림까지 6초");
  });

  it("5초 이하면 '곧 다시 알려드릴게요'를 반환한다 (경계)", () => {
    expect(formatNextNudgeCountdown(5 * 1000)).toBe("곧 다시 알려드릴게요");
    expect(formatNextNudgeCountdown(1 * 1000)).toBe("곧 다시 알려드릴게요");
    expect(formatNextNudgeCountdown(0)).toBe("곧 다시 알려드릴게요");
  });

  it("음수(이미 지난 시각)도 0으로 취급해 깨지지 않는다 (경계)", () => {
    expect(formatNextNudgeCountdown(-5000)).toBe("곧 다시 알려드릴게요");
  });
});
