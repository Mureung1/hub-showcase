import styles from './WeekSchedule.module.css';
import type { CalendarMark } from '../Calendar/Calendar';
import type { DaySummary } from '../../pages/Result/formatSchedule';

export interface WeekScheduleProps {
  /** 스케줄이 걸친 기간. 이 기간이 걸친 '주'(일~토)를 모두 가로로 늘어놓는다. "YYYY-MM-DD" */
  rangeStart: string;
  rangeEnd: string;
  /** 날짜별 표시(시험일 밑줄 등). 홈 월 캘린더와 같은 marks를 그대로 받는다 */
  marks?: CalendarMark[];
  /** 주 스트립 아래에 상시로 깔리는 날짜별 요약 리스트 */
  days: DaySummary[];
}

/** 일요일 시작 기준 요일 라벨(한국식) — 월 캘린더(Calendar)와 맞춘다 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 연·월·일 정수를 "YYYY-MM-DD" 로컬 문자열로. UTC 변환을 안 거쳐 타임존 밀림이 없다 */
function toKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * rangeStart~rangeEnd가 걸친 주(일요일 시작)들을 만든다. 각 주는 7일(일~토)의
 * 날짜 키 배열. 기간을 벗어난 앞뒤 날짜도 주를 채우기 위해 넣되, 부모에서 범위 밖으로
 * 흐리게 처리할 수 있게 날짜 키만 준다.
 */
function weeksInRange(rangeStart: string, rangeEnd: string): string[][] {
  const [sy, sm, sd] = rangeStart.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  // 시작일이 든 주의 일요일로 당긴다(getDay: 0=일). 그래야 주가 항상 일요일부터 시작
  start.setDate(start.getDate() - start.getDay());

  const [ey, em, ed] = rangeEnd.split('-').map(Number);
  const endKey = toKey(ey, em - 1, ed);

  const weeks: string[][] = [];
  const cursor = new Date(start);
  // 주의 첫날(일요일)이 종료일을 넘어설 때까지 반복 — 종료일이 든 주까지 포함된다
  while (toKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()) <= endKey) {
    const week: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i);
      week.push(toKey(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    weeks.push(week);
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

/** "7/20" — 주 라벨(범위)용 짧은 월/일 */
function shortMonthDay(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${m}/${d}`;
}

/**
 * #39 — 결과 화면 전용 주간 스케줄.
 * 위: 시험기간이 걸친 주들을 가로 스크롤 스트립(일~토)으로. 셀 표시(오늘·시험일)는 월
 * 캘린더(Calendar)와 같은 토큰·규칙을 쓴다. 아래: 날짜별 요약을 클릭 없이 세로로 상시 표시.
 * 홈 월 캘린더(Calendar)와 분리된 별도 컴포넌트다 — 결과 화면만 주 단위로 본다(#39 결정).
 */
export function WeekSchedule({ rangeStart, rangeEnd, marks, days }: WeekScheduleProps) {
  const markByDate = new Map((marks ?? []).map((m) => [m.date, m]));
  // "오늘"도 marks의 날짜 키(formatSchedule의 kstDateKey)와 같은 KST 기준으로 잡는다
  const todayKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

  const weeks = weeksInRange(rangeStart, rangeEnd);

  return (
    <div>
      {/* 주 스트립 — 가로 스크롤. 차트(.chartScroll)와 같은 방식으로 넘쳐도 옆으로 밀어 본다 */}
      <div className={styles.weekScroll}>
        {weeks.map((week) => (
          <div key={week[0]} className={styles.week}>
            <div className={styles.weekLabel}>
              {shortMonthDay(week[0])}~{shortMonthDay(week[6])}
            </div>

            <div className={styles.weekHeader}>
              {WEEKDAYS.map((w) => (
                <div key={w} className={styles.weekday}>
                  {w}
                </div>
              ))}
            </div>

            <div className={styles.weekRow}>
              {week.map((date) => {
                const inRange = date >= rangeStart && date <= rangeEnd;
                const mark = markByDate.get(date);
                const isToday = date === todayKey;
                const isExam = !!mark?.hasExam;
                const dayNum = Number(date.split('-')[2]);

                const cellClass = [
                  styles.cell,
                  inRange ? '' : styles.outside,
                  isToday ? styles.today : '',
                  isExam ? styles.exam : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div key={date} className={cellClass}>
                    <span className={styles.num}>{dayNum}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 날짜별 요약 — 클릭 없이 상시. "월) 22:00 취침 · 07:00 기상 · 14:00 카페인 …" */}
      <ul className={styles.summaryList}>
        {days.map((day) => (
          <li key={day.dateKey} className={styles.summaryItem}>
            <span className={styles.summaryDay}>{day.weekday})</span>
            <span className={styles.summaryText}>{day.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
