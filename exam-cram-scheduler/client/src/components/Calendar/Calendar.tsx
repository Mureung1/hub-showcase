import styles from './Calendar.module.css';

/** 캘린더 한 칸에 붙일 표시 정보. date는 "YYYY-MM-DD"(로컬 날짜) */
export interface CalendarMark {
  date: string;
  /** 이 날 시험이 있음 → 갈색 밑줄 */
  hasExam?: boolean;
  /** 이 날 추천 스케줄(수면/카페인)이 계산돼 있음 → 눌러서 상세를 볼 수 있는 날 */
  hasSchedule?: boolean;
}

export interface CalendarProps {
  /** 그릴 기간의 시작·끝. 이 범위가 걸친 '달'을 모두 표시한다. "YYYY-MM-DD" */
  rangeStart: string;
  rangeEnd: string;
  /** 날짜별 표시(밑줄/스케줄 여부). 없으면 평범한 캘린더 */
  marks?: CalendarMark[];
  /**
   * 날짜를 눌렀을 때 호출. 상세 BottomSheet를 여는 책임은 부모(홈/결과 화면)에 있다.
   * 이 컴포넌트는 "어느 날을 눌렀는지"만 알려준다.
   */
  onSelectDate?: (date: string) => void;
}

/** 일요일 시작 기준 요일 라벨(한국식). 주말 색 구분은 하지 않는다(시험 기간 표시가 우선) */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 연·월·일 정수를 "YYYY-MM-DD" 로컬 문자열로. UTC 변환을 안 거쳐서 타임존 밀림이 없다 */
function toKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** rangeStart~rangeEnd가 걸친 달들을 {year, month(0-based)} 목록으로 */
function monthsInRange(rangeStart: string, rangeEnd: string): { year: number; month: number }[] {
  const [sy, sm] = rangeStart.split('-').map(Number);
  const [ey, em] = rangeEnd.split('-').map(Number);
  const months: { year: number; month: number }[] = [];
  let year = sy;
  let month = sm - 1; // 입력은 1-based, 내부는 0-based로 통일
  while (year < ey || (year === ey && month <= em - 1)) {
    months.push({ year, month });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return months;
}

/** 한 달의 7열 그리드. 앞뒤 빈칸은 이웃 달 날짜로 채우고 inMonth=false로 구분 */
function buildGrid(year: number, month: number): { date: string; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  // getDay()는 0=일 ~ 6=토. 일요일 시작이라 그대로 앞 빈칸 개수로 쓴다(일→0, 토→6)
  const lead = first.getDay();
  const start = new Date(year, month, 1 - lead); // 이번 달 1일 앞의 빈칸을 메울 시작 날짜
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // 다음 달 0일 = 이번 달 마지막 날
  const total = Math.ceil((lead + daysInMonth) / 7) * 7; // 마지막 주까지 채워 7의 배수로

  const cells: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < total; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      date: toKey(d.getFullYear(), d.getMonth(), d.getDate()),
      inMonth: d.getMonth() === month,
    });
  }
  return cells;
}

/**
 * #27 — 시험 기간이 걸친 달을 보여주는 공유 월 캘린더.
 * 홈 화면과 결과 화면 양쪽에서 같은 컴포넌트를 쓰고, 데이터(marks)와 날짜 클릭 처리만
 * 부모가 다르게 넣어준다. docs/디자인.md에 캘린더 패턴이 없어 색·타이포는 기존 토큰에서만 파생.
 */
export function Calendar({ rangeStart, rangeEnd, marks, onSelectDate }: CalendarProps) {
  const markByDate = new Map((marks ?? []).map((m) => [m.date, m]));
  // "오늘"도 KST 기준으로 잡는다 — marks의 날짜 키(formatSchedule의 kstDateKey)와 같은 기준이라야
  // 브라우저 시간대가 한국이 아니어도 오늘 표시와 시험일 표시가 어긋나지 않는다.
  const todayKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

  const months = monthsInRange(rangeStart, rangeEnd);

  return (
    <div className={styles.calendar}>
      {months.map(({ year, month }) => (
        <div key={`${year}-${month}`} className={styles.month}>
          <div className={styles.monthLabel}>
            {year}년 {month + 1}월
          </div>

          <div className={styles.weekHeader}>
            {WEEKDAYS.map((w) => (
              <div key={w} className={styles.weekday}>
                {w}
              </div>
            ))}
          </div>

          <div className={styles.grid}>
            {buildGrid(year, month).map(({ date, inMonth }) => {
              const mark = markByDate.get(date);
              const isToday = inMonth && date === todayKey;
              const isExam = inMonth && !!mark?.hasExam;
              const dayNum = Number(date.split('-')[2]);

              const cellClass = [
                styles.cell,
                inMonth ? '' : styles.outside,
                isToday ? styles.today : '',
                isExam ? styles.exam : '',
              ]
                .filter(Boolean)
                .join(' ');

              // 이웃 달 날짜는 표시만 하고 누를 수 없게 둔다
              if (!inMonth) {
                return (
                  <div key={date} className={cellClass}>
                    <span className={styles.num}>{dayNum}</span>
                  </div>
                );
              }

              return (
                <button
                  key={date}
                  type="button"
                  className={cellClass}
                  onClick={() => onSelectDate?.(date)}
                >
                  <span className={styles.num}>{dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
