import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  totalXP,
  levelInfo,
  computeStreak,
  unlockedBadges,
  newlyUnlocked,
  sessionsThisWeek,
  daysSinceLastSession,
  xpForLevel,
  XP_NEW_SITUATION,
  XP_DAILY_FIRST,
} from "./gamification";
import type { Scores, SessionRecord, AssetRecord } from "./types";

// 로컬 2026-07-23 정오 고정("오늘"). KST는 DST가 없어 하루=정확히 86400000ms.
const NOW = new Date(2026, 6, 23, 12, 0, 0);

const scores = (v: number): Scores => ({ context: v, register: v, strategy: v });
/** 2026-07-{day} 정오 세션. ts 없이 만들려면 withTs=false. */
const sess = (day: number, v = 2, withTs = true, sid = "pq"): SessionRecord => ({
  d: `7.${day}`,
  sid,
  scores: scores(v),
  ...(withTs ? { ts: new Date(2026, 6, day, 12).getTime() } : {}),
});
const asset = (id: string): AssetRecord => ({ id, text: "표현", sid: "pq", date: "7.23" });

describe("totalXP", () => {
  it("빈 history는 0", () => {
    expect(totalXP([])).toBe(0);
  });
  it("세션 점수 + 새 상황 보너스 + 매일 첫 훈련 보너스를 합산", () => {
    // 같은 상황을 이틀에 걸쳐 만점 2회: 200점 + 상황 1개 + 훈련일 2일
    expect(totalXP([sess(22, 3), sess(23, 3)])).toBe(200 + XP_NEW_SITUATION + 2 * XP_DAILY_FIRST);
  });
  it("같은 상황을 반복해도 새 상황 보너스는 한 번만", () => {
    // 같은 날 같은 상황 2회: 200점 + 상황 1개 + 훈련일 1일
    expect(totalXP([sess(23, 3), sess(23, 3)])).toBe(200 + XP_NEW_SITUATION + XP_DAILY_FIRST);
  });
  it("다른 상황이면 새 상황 보너스를 각각 받는다", () => {
    expect(totalXP([sess(23, 3), sess(23, 3, true, "other")])).toBe(200 + 2 * XP_NEW_SITUATION + XP_DAILY_FIRST);
  });
  it("ts 없는 과거 기록엔 매일 첫 훈련 보너스가 붙지 않는다", () => {
    expect(totalXP([sess(23, 3, false)])).toBe(100 + XP_NEW_SITUATION);
  });
});

describe("levelInfo", () => {
  it("xp 0이면 레벨 1, 다음 레벨까지 200", () => {
    const l = levelInfo(0);
    expect(l.level).toBe(1);
    expect(l.xpIntoLevel).toBe(0);
    expect(l.xpForNext).toBe(xpForLevel(1));
    expect(l.progress).toBe(0);
  });
  it("레벨업 요구치는 레벨마다 100씩 늘어난다", () => {
    expect(xpForLevel(1)).toBe(200);
    expect(xpForLevel(2)).toBe(300);
    expect(xpForLevel(9)).toBe(1000);
  });
  it("딱 200이면 레벨 2로 넘어가고 잔여 0", () => {
    const l = levelInfo(200);
    expect(l.level).toBe(2);
    expect(l.xpIntoLevel).toBe(0);
    expect(l.xpForNext).toBe(300);
  });
  it("레벨 2 중간(350)이면 진행도 0.5", () => {
    const l = levelInfo(350);
    expect(l.level).toBe(2);
    expect(l.xpIntoLevel).toBe(150);
    expect(l.progress).toBeCloseTo(0.5);
  });
  it("누적 1,400이면 레벨 5 (200+300+400+500)", () => {
    expect(levelInfo(1400).level).toBe(5);
    expect(levelInfo(1399).level).toBe(4);
  });
  it("음수 xp도 레벨 1로 떨어뜨린다", () => {
    expect(levelInfo(-10).level).toBe(1);
  });
});

describe("computeStreak", () => {
  beforeEach(() => vi.setSystemTime(NOW));
  afterEach(() => vi.useRealTimers());

  it("기록이 없으면 전부 0", () => {
    expect(computeStreak([])).toEqual({ current: 0, best: 0, trainedToday: false });
  });
  it("오늘 훈련하면 current 1 · trainedToday true", () => {
    const s = computeStreak([sess(23)]);
    expect(s.current).toBe(1);
    expect(s.trainedToday).toBe(true);
  });
  it("오늘 포함 3일 연속이면 current·best 3", () => {
    const s = computeStreak([sess(21), sess(22), sess(23)]);
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
    expect(s.trainedToday).toBe(true);
  });
  it("어제까지 3일 연속이고 오늘 안 하면 current 3 · trainedToday false", () => {
    const s = computeStreak([sess(20), sess(21), sess(22)]);
    expect(s.current).toBe(3);
    expect(s.trainedToday).toBe(false);
  });
  it("마지막 훈련이 그저께 이전이면 current 0 (스트릭 끊김)", () => {
    const s = computeStreak([sess(19), sess(20)]);
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
  });
  it("best는 최고 구간, current는 최근 구간만 센다", () => {
    // 10~12 연속 3일(과거) + 22~23 연속 2일(최근, 오늘 포함)
    const s = computeStreak([sess(10), sess(11), sess(12), sess(22), sess(23)]);
    expect(s.best).toBe(3);
    expect(s.current).toBe(2);
  });
  it("같은 날 여러 세션은 하루로 집계", () => {
    const s = computeStreak([sess(23), sess(23), sess(22)]);
    expect(s.current).toBe(2);
  });
  it("ts가 없는 과거 기록은 무시", () => {
    const s = computeStreak([sess(23, 2, false), sess(23)]);
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
  });
});

describe("unlockedBadges", () => {
  beforeEach(() => vi.setSystemTime(NOW));
  afterEach(() => vi.useRealTimers());

  it("빈 상태면 아무 배지도 없음", () => {
    expect(unlockedBadges({ history: [], assets: [] })).toEqual([]);
  });
  it("세션 1개면 first-session 해금", () => {
    const ids = unlockedBadges({ history: [sess(23)], assets: [] }).map((b) => b.id);
    expect(ids).toContain("first-session");
  });
  it("90점 이상 세션이면 score-90 해금", () => {
    const ids = unlockedBadges({ history: [sess(23, 3)], assets: [] }).map((b) => b.id);
    expect(ids).toContain("score-90");
  });
  it("표현 5개면 assets-5 해금", () => {
    const assets = [1, 2, 3, 4, 5].map((n) => asset("a" + n));
    const ids = unlockedBadges({ history: [], assets }).map((b) => b.id);
    expect(ids).toContain("assets-5");
  });
  it("표현 4개면 assets-5 미해금", () => {
    const assets = [1, 2, 3, 4].map((n) => asset("a" + n));
    const ids = unlockedBadges({ history: [], assets }).map((b) => b.id);
    expect(ids).not.toContain("assets-5");
  });
  it("3일 연속이면 streak-3 해금", () => {
    const ids = unlockedBadges({ history: [sess(21), sess(22), sess(23)], assets: [] }).map((b) => b.id);
    expect(ids).toContain("streak-3");
  });
  it("만점(100) 세션 3회면 perfect-3 해금", () => {
    const hist = [sess(21, 3), sess(22, 3), sess(23, 3)];
    const ids = unlockedBadges({ history: hist, assets: [] }).map((b) => b.id);
    expect(ids).toContain("perfect-3");
  });
  it("만점 세션 2회면 perfect-3 미해금", () => {
    const hist = [sess(22, 3), sess(23, 3), sess(21, 2)];
    const ids = unlockedBadges({ history: hist, assets: [] }).map((b) => b.id);
    expect(ids).not.toContain("perfect-3");
  });
});

describe("sessionsThisWeek", () => {
  beforeEach(() => vi.setSystemTime(NOW));
  afterEach(() => vi.useRealTimers());

  it("기록이 없으면 0", () => {
    expect(sessionsThisWeek([])).toBe(0);
  });
  it("오늘 세션은 포함", () => {
    expect(sessionsThisWeek([sess(23)])).toBe(1);
  });
  it("최근 7일 창(오늘 포함 6일 전까지)만 카운트", () => {
    // 오늘 23일 → 17일(6일 전)까지 포함, 16일(7일 전)은 제외
    expect(sessionsThisWeek([sess(17), sess(20), sess(23)])).toBe(3);
    expect(sessionsThisWeek([sess(16), sess(23)])).toBe(1);
  });
  it("같은 날 여러 세션도 각각 카운트(일수 아님)", () => {
    expect(sessionsThisWeek([sess(23), sess(23), sess(22)])).toBe(3);
  });
  it("ts 없는 기록은 제외", () => {
    expect(sessionsThisWeek([sess(23, 2, false), sess(23)])).toBe(1);
  });
});

describe("daysSinceLastSession", () => {
  beforeEach(() => vi.setSystemTime(NOW));
  afterEach(() => vi.useRealTimers());

  it("기록이 없으면 null", () => {
    expect(daysSinceLastSession([])).toBeNull();
  });
  it("오늘 훈련했으면 0", () => {
    expect(daysSinceLastSession([sess(23)])).toBe(0);
  });
  it("어제가 마지막이면 1", () => {
    expect(daysSinceLastSession([sess(22)])).toBe(1);
  });
  it("여러 기록 중 가장 최근 기준으로 계산", () => {
    expect(daysSinceLastSession([sess(10), sess(20), sess(23)])).toBe(0);
    expect(daysSinceLastSession([sess(10), sess(20)])).toBe(3);
  });
  it("ts 없는 기록은 무시", () => {
    expect(daysSinceLastSession([sess(23, 2, false)])).toBeNull();
  });
});

describe("newlyUnlocked", () => {
  beforeEach(() => vi.setSystemTime(NOW));
  afterEach(() => vi.useRealTimers());

  it("첫 세션 직후엔 first-session만 새로 해금", () => {
    const before = { history: [], assets: [] };
    const after = { history: [sess(23)], assets: [] };
    const ids = newlyUnlocked(before, after).map((b) => b.id);
    expect(ids).toEqual(["first-session"]);
  });
  it("상태 변화가 없으면 빈 배열", () => {
    const s = { history: [sess(23)], assets: [] };
    expect(newlyUnlocked(s, s)).toEqual([]);
  });
});
