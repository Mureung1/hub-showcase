// #19 — 계산 결과를 브라우저에 저장한다.
// 사용자 스케줄은 Supabase에 넣지 않는다(CLAUDE.md) — 계정·로그인이 필요해지기 때문.
// 이 브라우저에서만 보이는 기록이고, 다른 기기와는 공유되지 않는다.
import type { ScheduleCalculateRequest, ScheduleCalculateResponse } from '../api/calculateSchedule';

const STORAGE_KEY = 'exam-cram-scheduler:saved-schedules:v1';
/** 오래된 기록이 무한히 쌓이지 않게 최근 것만 남긴다 */
const MAX_RECORDS = 10;

export interface SavedSchedule {
  id: string;
  /** 저장한 시각(ISO) */
  savedAt: string;
  request: ScheduleCalculateRequest;
  response: ScheduleCalculateResponse;
}

/**
 * 저장된 기록을 최신순으로 읽는다.
 *
 * localStorage는 브라우저 설정(시크릿 모드·저장 차단)에 따라 아예 못 쓸 수 있고,
 * 저장된 값이 깨져 있을 수도 있다. 어느 쪽이든 홈 화면이 죽으면 안 되므로
 * 실패하면 빈 목록으로 취급한다.
 */
export function loadSavedSchedules(): SavedSchedule[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // 형태가 맞는 것만 남긴다 — 예전 버전이 남긴 값이 섞여 있어도 화면이 깨지지 않게
    return parsed.filter((item): item is SavedSchedule => {
      const r = item as Partial<SavedSchedule> | null;
      return (
        !!r &&
        typeof r.id === 'string' &&
        typeof r.savedAt === 'string' &&
        !!r.request &&
        !!r.response &&
        Array.isArray(r.response.alertnessTimeline)
      );
    });
  } catch {
    return [];
  }
}

/**
 * 계산 결과 하나를 저장하고, 저장 후의 전체 목록을 돌려준다.
 * 저장에 실패해도(용량 초과 등) 예외를 밖으로 던지지 않는다 — 저장이 안 됐다고
 * 결과 화면이 멈추면 안 되기 때문. 실패하면 false를 반환한다.
 */
export function saveSchedule(
  request: ScheduleCalculateRequest,
  response: ScheduleCalculateResponse,
): { ok: boolean; records: SavedSchedule[] } {
  const record: SavedSchedule = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    request,
    response,
  };

  const records = [record, ...loadSavedSchedules()].slice(0, MAX_RECORDS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return { ok: true, records };
  } catch {
    return { ok: false, records };
  }
}

/**
 * #40 — 저장된 기록 하나를 id로 지우고, 지운 뒤의 전체 목록을 돌려준다.
 * 저장과 마찬가지로 실패해도 예외를 던지지 않는다(홈 화면이 멈추면 안 되므로).
 * 지울 대상이 없어도 남은 목록을 그대로 돌려준다.
 */
export function deleteSchedule(id: string): SavedSchedule[] {
  const records = loadSavedSchedules().filter((record) => record.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 저장에 실패하면 localStorage에는 옛 목록이 남지만, 화면에는 지운 목록을 돌려줘
    // 최소한 이번 세션에서는 사라진 것처럼 보이게 한다.
  }
  return records;
}

/** 가장 최근에 저장한 기록. 없으면 null */
export function loadLatestSchedule(): SavedSchedule | null {
  return loadSavedSchedules()[0] ?? null;
}

/**
 * 저장된 기록에서 "아직 안 지난 시험 중 가장 가까운 것"을 찾는다.
 * 홈 화면 맨 위 D-day 표시에 쓴다. 시험이 다 지났으면 null.
 */
export function findNearestUpcomingExam(
  record: SavedSchedule | null,
  now: Date = new Date(),
): { subject: string; examDateTime: string; daysLeft: number } | null {
  if (!record) return null;

  const 다가오는 = record.request.exams
    .map((exam) => ({ subject: exam.subject, examDateTime: exam.examDateTime }))
    .filter((exam) => new Date(exam.examDateTime).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.examDateTime).getTime() - new Date(b.examDateTime).getTime());

  const 가장가까운 = 다가오는[0];
  if (!가장가까운) return null;

  // D-day는 "며칠 뒤인가"이므로 시각이 아니라 날짜(한국 기준) 차이로 센다 —
  // 오늘 23시에 봐도 내일 시험은 D-1이어야 한다.
  const 날짜만 = (d: Date) =>
    new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(d)).getTime();
  const daysLeft = Math.round((날짜만(new Date(가장가까운.examDateTime)) - 날짜만(now)) / 86400000);

  return { ...가장가까운, daysLeft };
}
