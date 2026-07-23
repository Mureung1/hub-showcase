import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { homeNudge } from "./gamification";
import type { Scores, SessionRecord } from "./types";

// BDD: 홈 화면 넛지 문구 — 사용자 상태별로 다른 독려 메시지를 보여준다.
const NOW = new Date(2026, 6, 23, 12, 0, 0);
const scores = (v: number): Scores => ({ context: v, register: v, strategy: v });
const sess = (day: number): SessionRecord => ({
  d: `7.${day}`,
  sid: "pq",
  scores: scores(2),
  ts: new Date(2026, 6, day, 12).getTime(),
});

describe("Feature: 홈 넛지 문구", () => {
  beforeEach(() => vi.setSystemTime(NOW));
  afterEach(() => vi.useRealTimers());

  it("Scenario: 훈련 기록이 없는 첫 방문자에게 시작을 권한다", () => {
    // Given 아직 아무 세션도 없다
    const history: SessionRecord[] = [];
    // When 홈 넛지를 요청하면
    const msg = homeNudge(history);
    // Then 첫 훈련을 시작하라는 문구가 나온다
    expect(msg).toContain("첫");
  });

  it("Scenario: 오늘 훈련한 사용자를 격려한다", () => {
    // Given 오늘 훈련을 마쳤다
    const history = [sess(23)];
    // When 홈 넛지를 요청하면
    const msg = homeNudge(history);
    // Then '오늘'을 언급하며 '일째 쉬는 중'은 아니다
    expect(msg).toContain("오늘");
    expect(msg).not.toContain("쉬는 중");
  });

  it("Scenario: 3일 쉰 사용자에게 복귀를 권한다", () => {
    // Given 마지막 훈련이 3일 전이다
    const history = [sess(20)];
    // When 홈 넛지를 요청하면
    const msg = homeNudge(history);
    // Then '3일'과 복귀 유도가 나온다
    expect(msg).toContain("3일");
    expect(msg).toContain("쉬는 중");
  });
});
