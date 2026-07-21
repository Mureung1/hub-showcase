// 게이미피케이션(레벨·XP·스트릭·배지) — history/assets에서 전부 파생 계산, 별도 저장 없음
import { AXES, totalOf } from './situations';
import type { AssetRecord, SessionRecord } from './types';

export interface GamificationState {
  history: SessionRecord[];
  assets: AssetRecord[];
}

// --- XP / 레벨 ---

export const XP_PER_LEVEL = 300;

export function totalXP(history: SessionRecord[]): number {
  return history.reduce((sum, h) => sum + totalOf(h.scores), 0);
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0~1
}

export function levelInfo(xp: number): LevelInfo {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;
  return { level, xpIntoLevel, xpForNext: XP_PER_LEVEL, progress: xpIntoLevel / XP_PER_LEVEL };
}

// --- 스트릭 ---

export interface StreakInfo {
  current: number;
  best: number;
  trainedToday: boolean;
}

function dayStart(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function computeStreak(history: SessionRecord[]): StreakInfo {
  const DAY = 86400000;
  const days = Array.from(new Set(history.filter((h) => h.ts).map((h) => dayStart(h.ts!)))).sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, best: 0, trainedToday: false };

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] - days[i - 1] === DAY ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const today = dayStart(Date.now());
  const last = days[days.length - 1];
  let current = 0;
  if (last === today || last === today - DAY) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      if (days[i] - days[i - 1] === DAY) current++;
      else break;
    }
  }
  return { current, best, trainedToday: last === today };
}

// --- 배지 ---

export interface Badge {
  id: string;
  icon: string;
  label: string;
  desc: string;
  check: (s: GamificationState) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first-session', icon: '🌱', label: '첫 걸음', desc: '첫 훈련 세션 완료', check: (s) => s.history.length >= 1 },
  { id: 'score-90', icon: '💎', label: '거의 완벽', desc: '한 세션에서 90점 이상 획득', check: (s) => s.history.some((h) => totalOf(h.scores) >= 90) },
  { id: 'sessions-10', icon: '📚', label: '꾸준한 훈련', desc: '세션 10회 완료', check: (s) => s.history.length >= 10 },
  { id: 'sessions-50', icon: '🏆', label: '숙련자', desc: '세션 50회 완료', check: (s) => s.history.length >= 50 },
  { id: 'streak-3', icon: '🔥', label: '3일 연속', desc: '3일 연속 훈련', check: (s) => computeStreak(s.history).best >= 3 },
  { id: 'streak-7', icon: '🔥', label: '일주일 연속', desc: '7일 연속 훈련', check: (s) => computeStreak(s.history).best >= 7 },
  { id: 'streak-30', icon: '🔥', label: '한 달 연속', desc: '30일 연속 훈련', check: (s) => computeStreak(s.history).best >= 30 },
  { id: 'assets-5', icon: '✨', label: '표현 수집가', desc: '잘 쓴 표현 5개 수집', check: (s) => s.assets.length >= 5 },
  {
    id: 'balanced',
    icon: '⚖️',
    label: '균형잡힌 화용',
    desc: '세 축 평균 2.5 이상',
    check: (s) =>
      s.history.length > 0 &&
      AXES.every((ax) => s.history.reduce((sum, h) => sum + h.scores[ax.key], 0) / s.history.length >= 2.5),
  },
];

export function unlockedBadges(s: GamificationState): Badge[] {
  return BADGES.filter((b) => b.check(s));
}

/** before → after 사이에 새로 해금된 배지만 반환 (세션 종료 직후 축하용) */
export function newlyUnlocked(before: GamificationState, after: GamificationState): Badge[] {
  const beforeIds = new Set(unlockedBadges(before).map((b) => b.id));
  return unlockedBadges(after).filter((b) => !beforeIds.has(b.id));
}
