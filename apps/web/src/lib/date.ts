// UI용 날짜 헬퍼. 유통기한은 'YYYY-MM-DD' 문자열(로컬 자정 기준)로 다룬다.
// FEFO '로직'은 여기 두지 않는다 — 실제 차감이 필요한 Slice 2에서 packages/core에 추가한다.
//
// 주의: toISOString()은 UTC로 변환돼 자정 근처에서 하루가 밀 수 있다.
// 로컬 자정 기준으로 계산해야 사장님이 보는 '오늘'과 어긋나지 않는다.

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

// 임박 기준(D-day). 프로토타입 기본값 3(README). 사용자가 조절하는 유통기한 캘린더는 후속 Slice —
// 그때 이 상수를 설정 상태로 승격한다.
export const IMMINENT_DAYS = 3;

export type ExpiryStatus = "expired" | "imminent" | null;

// 유통기한 문자열만으로 판정(재고 데이터 불필요). 지남 = D-day<0, 임박 = 0..기준.
export function expiryStatus(
  iso: string,
  threshold: number = IMMINENT_DAYS
): ExpiryStatus {
  if (!iso) return null;
  const d = dDay(iso);
  if (d < 0) return "expired";
  if (d <= threshold) return "imminent";
  return null;
}

/** Date → 로컬 기준 'YYYY-MM-DD' */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 오늘 'YYYY-MM-DD' (로컬) */
export function todayISO(): string {
  return toISODate(new Date());
}

/** 'YYYY-MM-DD'에 n일 더한 날짜 문자열 */
export function addDaysISO(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** D-day = (expiry - today) 일수. 음수면 이미 지남, 0이면 오늘 만료. */
export function dDay(iso: string, base: string = todayISO()): number {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((fromISO(iso).getTime() - fromISO(base).getTime()) / MS);
}

/** D-day 라벨: 미래 "D-3", 오늘 "D-day", 지남 "D+2"(2일 지남). */
export function ddayLabel(d: number): string {
  if (d > 0) return `D-${d}`;
  if (d === 0) return "D-day";
  return `D+${-d}`;
}

/** 상단바 날짜: "7.13 (월)" */
export function formatMonthDay(d: Date): string {
  return `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAY_KO[d.getDay()]})`;
}

/** 선택일 패널 날짜: "7월 15일 (수)" */
export function formatFullDay(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KO[d.getDay()]})`;
}

/** 상단바 시각: "오후 2:16" */
export function formatTime(d: Date): string {
  const h = d.getHours();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${ampm} ${h12}:${mm}`;
}

// 'YYYY-MM-DD'를 로컬 자정 Date로 파싱(문자열 생성자의 UTC 해석 회피).
function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
