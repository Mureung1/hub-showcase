import type { Lot } from "@sherpa/core";
import { dDay, toISODate } from "./date";

// 유통기한 캘린더의 셀/집계 유틸. 날짜 계산은 lib/date를 재사용한다.

export type DayStatus = "expired" | "imminent" | "plenty" | "none";

export interface CalendarCell {
  /** 이 달의 날짜면 'YYYY-MM-DD', 선행/후행 공백이면 null. */
  iso: string | null;
  /** 날짜 숫자(공백이면 0). */
  day: number;
  /** 그날 만료 예정 Lot 수. */
  count: number;
  /** 그날 최소 D-day로 결정한 상태(색 결정용). */
  status: DayStatus;
}

/** 'YYYY-MM' 기준 라벨 "2026년 7월". */
export function monthLabel(year: number, month0: number): string {
  return `${year}년 ${month0 + 1}월`;
}

/** 이전/다음 달로 이동(연 경계 처리). month0은 0-based. */
export function prevMonth(year: number, month0: number): { year: number; month0: number } {
  return month0 === 0 ? { year: year - 1, month0: 11 } : { year, month0: month0 - 1 };
}
export function nextMonth(year: number, month0: number): { year: number; month0: number } {
  return month0 === 11 ? { year: year + 1, month0: 0 } : { year, month0: month0 + 1 };
}

/** Lot들을 유통기한(ISO)별로 묶는다. */
export function groupLotsByDay(lots: Lot[]): Map<string, Lot[]> {
  const map = new Map<string, Lot[]>();
  for (const lot of lots) {
    const arr = map.get(lot.expiryDate);
    if (arr) arr.push(lot);
    else map.set(lot.expiryDate, [lot]);
  }
  return map;
}

// 그날 Lot들의 최소 D-day로 상태를 정한다(가장 급한 것 기준). count 0이면 'none'.
function dayStatus(lots: Lot[] | undefined, threshold: number): DayStatus {
  if (!lots || lots.length === 0) return "none";
  const minD = lots.reduce((m, l) => Math.min(m, dDay(l.expiryDate)), Infinity);
  if (minD < 0) return "expired";
  if (minD <= threshold) return "imminent";
  return "plenty";
}

// 월 그리드: 앞쪽에 그 달 1일의 요일만큼 공백, 뒤쪽은 마지막 주를 7칸으로 채우는 공백.
export function monthCells(
  year: number,
  month0: number,
  byDay: Map<string, Lot[]>,
  threshold: number
): CalendarCell[] {
  const first = new Date(year, month0, 1);
  const lead = first.getDay(); // 0=일
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ iso: null, day: 0, count: 0, status: "none" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISODate(new Date(year, month0, d));
    const lots = byDay.get(iso);
    cells.push({
      iso,
      day: d,
      count: lots?.length ?? 0,
      status: dayStatus(lots, threshold),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ iso: null, day: 0, count: 0, status: "none" });
  }
  return cells;
}
