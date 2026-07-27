// 게이미피케이션(레벨·XP·스트릭·배지) — history/assets에서 전부 파생 계산, 별도 저장 없음
import { AXES, totalOf } from './situations';
import type { AssetRecord, SessionRecord } from './types';

export interface GamificationState {
  history: SessionRecord[];
  assets: AssetRecord[];
}

// --- XP / 레벨 ---
//
// XP는 '활동'을 보상한다(듀오링고식). 예전엔 세션 총점을 그대로 더해 XP가 점수에 커플링됐고,
// 낮은 점수로도 세션을 많이 하면 그만큼 올랐다("실력색"이 강함). 이제 세션 완료 자체에 플랫 XP를
// 주고 잘한 세션에만 보너스를 얹는다. 전부 history에서 파생 — 따로 저장하지 않는다.
//   ① 세션 완료      : 세션마다 +15 (활동).
//   ② 잘한 세션      : 총점 80 이상이면 +10 (품질 보너스).
//   ③ 새 상황        : 처음 해보는 상황마다 +20. 반복으론 다시 안 준다.
//   ④ 매일 첫 훈련   : 훈련한 날마다 +10. 하루에 몰아쳐도 한 번만.
// ③④는 "고유 개수"라 기록 순서와 무관하게 같은 값(재계산 안전).

export const XP_PER_SESSION = 15;
export const XP_QUALITY_BONUS = 10;
export const XP_QUALITY_THRESHOLD = 80;
export const XP_NEW_SITUATION = 20;
export const XP_DAILY_FIRST = 10;

/** 세션 하나가 주는 XP — 완료(활동) + 잘한 세션 보너스. 점수합 커플링을 끊는다. */
export function sessionXP(rec: SessionRecord): number {
  return XP_PER_SESSION + (totalOf(rec.scores) >= XP_QUALITY_THRESHOLD ? XP_QUALITY_BONUS : 0);
}

export function totalXP(history: SessionRecord[]): number {
  const base = history.reduce((sum, h) => sum + sessionXP(h), 0);
  const sids = new Set(history.map((h) => h.sid)).size;
  const days = new Set(history.filter((h) => h.ts).map((h) => dayStart(h.ts!))).size;
  return base + sids * XP_NEW_SITUATION + days * XP_DAILY_FIRST;
}

/**
 * 레벨 n → n+1 에 필요한 XP. 세션당 XP가 작아졌으므로(활동 기반) 곡선도 낮춰 초반 진입을 지킨다.
 * Lv1→2 = 100(약 4~6세션), Lv5까지 누적 700.
 * ponytail: 곡선은 sessionXP(15~25)에 맞춘 손튜닝 — 세션당 XP를 바꾸면 여기도 같이 조정할 것.
 */
export function xpForLevel(level: number): number {
  return 50 + 50 * level;
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0~1
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  const xpForNext = xpForLevel(level);
  return { level, xpIntoLevel: rest, xpForNext, progress: rest / xpForNext };
}

// --- 데일리 목표 (듀오링고식 일일 XP 목표) ---
//
// 오늘 벌어들인 XP가 목표치를 넘으면 그날의 목표 달성. 자정(dayStart)에 리셋된다.
// '오늘 XP'는 오늘 세션들의 총점 합 — XP의 지배 성분(세션 점수)과 같은 통화를 쓴다.
// ponytail: 목표치는 기본 상수 하나. 사용자별 선택(캐주얼/보통/집중)은 Profile+Settings가 필요해 나중에.

export const DAILY_XP_GOAL = 40;

export interface DailyGoalInfo {
  earned: number;
  goal: number;
  progress: number; // 0~1 (목표 초과해도 1로 clamp)
  met: boolean;
}

/** 오늘 벌어들인 XP — 오늘(로컬 자정 기준) 세션들의 sessionXP 합. 평생 XP와 같은 통화. ts 없는 기록 제외. */
export function xpToday(history: SessionRecord[]): number {
  const today = dayStart(Date.now());
  return history
    .filter((h) => h.ts && dayStart(h.ts) === today)
    .reduce((sum, h) => sum + sessionXP(h), 0);
}

export function dailyGoal(history: SessionRecord[], goal: number = DAILY_XP_GOAL): DailyGoalInfo {
  const earned = xpToday(history);
  return { earned, goal, progress: goal > 0 ? Math.min(1, earned / goal) : 0, met: earned >= goal };
}

// --- 주간 리그 (다른 사용자 없는 '자기 자신과의' 주간 경쟁) ---
//
// 듀오링고 리그의 자기 버전. 실사용자가 거의 없는 데모라 남의 데이터로 순위를 매길 수 없으니
// '이번 주 나 vs 지난 주들의 나'로 경쟁시킨다(가짜 경쟁자 없음 — 정직). 주는 월요일 시작(로컬).
// 주간 XP는 sessionXP 합만 쓴다 — 새상황·매일 보너스는 평생 개념이라 주 단위엔 넣지 않는다.

const WEEK_MS = 7 * 86400000;

/** ts가 속한 주의 월요일 00:00(로컬). */
function weekStart(ts: number): number {
  const d0 = dayStart(ts);
  const dow = (new Date(d0).getDay() + 6) % 7; // 월=0
  return d0 - dow * 86400000;
}

/** [weekStartMs, +7일) 세션들의 sessionXP 합. */
export function xpForWeek(history: SessionRecord[], weekStartMs: number): number {
  return history
    .filter((h) => h.ts && h.ts >= weekStartMs && h.ts < weekStartMs + WEEK_MS)
    .reduce((sum, h) => sum + sessionXP(h), 0);
}

export interface WeekBar {
  weekStart: number;
  xp: number;
  current: boolean;
}

/** 최근 n주(이번 주 포함, 과거→현재 순) 주간 XP — 비교 막대·추세용. */
export function recentWeeks(history: SessionRecord[], n = 5): WeekBar[] {
  const thisWeek = weekStart(Date.now());
  const out: WeekBar[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ws = thisWeek - i * WEEK_MS;
    out.push({ weekStart: ws, xp: xpForWeek(history, ws), current: i === 0 });
  }
  return out;
}

export interface WeeklyLeague {
  thisWeekXP: number;
  bestWeekXP: number; // 최근 n주 중 최고(이번 주 포함)
  isBest: boolean;    // 이번 주가 자기 최고 기록인가(0보다 클 때만)
  goalDays: number;   // 이번 주 일일목표 달성일 수 (0~7)
  weeks: WeekBar[];
}

/** 이번 주 XP, 자기 최고 주와의 비교, 일일목표 달성일. goal은 일일 목표치. */
export function weeklyLeague(history: SessionRecord[], goal: number = DAILY_XP_GOAL, n = 5): WeeklyLeague {
  const weeks = recentWeeks(history, n);
  const thisWeekXP = weeks[weeks.length - 1].xp;
  const bestWeekXP = Math.max(...weeks.map((w) => w.xp));
  const ws = weekStart(Date.now());
  let goalDays = 0;
  for (let d = 0; d < 7; d++) {
    const from = ws + d * 86400000;
    const dayXP = history
      .filter((h) => h.ts && h.ts >= from && h.ts < from + 86400000)
      .reduce((sum, h) => sum + sessionXP(h), 0);
    if (dayXP >= goal) goalDays++;
  }
  return { thisWeekXP, bestWeekXP, isBest: thisWeekXP > 0 && thisWeekXP >= bestWeekXP, goalDays, weeks };
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

/** 오늘 포함 최근 7일 내 세션 수(일수 아님 — 같은 날 여러 세션도 각각). ts 없는 기록 제외. */
export function sessionsThisWeek(history: SessionRecord[]): number {
  const DAY = 86400000;
  const windowStart = dayStart(Date.now()) - 6 * DAY;
  return history.filter((h) => h.ts && dayStart(h.ts) >= windowStart).length;
}

/** 마지막 훈련일로부터 지난 일수(오늘=0, 어제=1). 기록·ts 없으면 null. */
export function daysSinceLastSession(history: SessionRecord[]): number | null {
  const DAY = 86400000;
  const days = history.filter((h) => h.ts).map((h) => dayStart(h.ts!));
  if (days.length === 0) return null;
  return Math.round((dayStart(Date.now()) - Math.max(...days)) / DAY);
}

/** 홈 화면 넛지 문구 — 마지막 훈련 이후 경과에 따라 독려 메시지. */
export function homeNudge(history: SessionRecord[]): string {
  const d = daysSinceLastSession(history);
  if (d === null) return '첫 훈련을 시작해볼까요?';
  if (d === 0) return '오늘도 훈련을 마쳤어요. 좋아요!';
  return `${d}일째 쉬는 중 — 다시 시작해볼까요?`;
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
    id: 'perfect-3',
    icon: '💯',
    label: '완벽주의자',
    desc: '만점(100점) 세션 3회 달성',
    check: (s) => s.history.filter((h) => totalOf(h.scores) === 100).length >= 3,
  },
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
