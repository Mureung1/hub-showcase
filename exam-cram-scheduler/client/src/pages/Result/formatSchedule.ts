// #18 — 서버 응답의 ISO 시각을 화면에 보여줄 한국어 라벨로 바꾸고,
// 밤(취침~기상)·카페인·시험을 "하루" 단위로 묶는다.
// 서버는 시각만 주고 과목명은 안 주므로, 요청(request)의 시험 목록과 날짜로 짝을 맞춘다.
import type { ScheduleCalculateRequest, ScheduleCalculateResponse } from '../../api/calculateSchedule';
import type { CalendarMark } from '../../components/Calendar/Calendar';
import type { CalendarDayDetail } from '../../components/Calendar/CalendarDaySheet';

const KST = 'Asia/Seoul';

/** ISO 시각 -> "05:30" (한국 시간) */
export function formatKstTime(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** ISO 시각 -> "월" (한국 시간 기준 요일) */
export function formatKstWeekday(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: KST, weekday: 'short' }).format(new Date(iso));
}

/** ISO 시각 -> "월 05:30". 자리가 좁은 그래프 라벨용 */
export function formatKstDayTime(iso: string): string {
  return `${formatKstWeekday(iso)} ${formatKstTime(iso)}`;
}

/**
 * ISO 시각 -> "7/23(목)"
 *
 * "오늘"·"내일" 같은 상대 표현은 쓰지 않는다(2026-07-22 결정). 저장한 스케줄을
 * 며칠 뒤에 다시 열어보면 거짓말이 되기 때문 — 월요일에 저장한 "오늘 취침"을
 * 토요일에 보는 상황이 실제로 생긴다(#19 저장 기능).
 */
export function formatKstDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    month: 'numeric',
    day: 'numeric',
  }).format(d);
  // ko-KR은 "7. 23." 형태를 주므로 "7/23"으로 다듬는다
  const [month, day] = parts.replace(/\s/g, '').split('.').filter(Boolean);
  return `${month}/${day}(${formatKstWeekday(iso)})`;
}

/** ISO 시각 -> "7/23(목) 05:30" */
export function formatKstDateTime(iso: string): string {
  return `${formatKstDate(iso)} ${formatKstTime(iso)}`;
}

/** ISO 시각 -> "2026-07-24" (한국 기준 날짜). 같은 날인지 비교할 때 쓴다. */
export function kstDateKey(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: KST }).format(new Date(iso));
}

/**
 * 잔 수를 사람이 읽는 말로. 1 -> "1잔", 1.5 -> "1.5잔", 0.5 -> "반 잔"(#3)
 * 실행하기 쉬운 잔 수를 앞에 두고, 실제 양이 궁금한 사람을 위해 mg를 괄호로 함께 적는다.
 */
export function formatCups(cups: number, amountMg?: number): string {
  const 잔 = cups === 0.5 ? '반 잔' : `${cups % 1 === 0 ? cups : cups.toFixed(1)}잔`;
  return amountMg === undefined ? 잔 : `${잔}(${amountMg}mg)`;
}

/** #39 — 결과 화면 주간 요약 리스트의 한 줄 */
export interface DaySummary {
  /** 정렬·키용 날짜(KST) "YYYY-MM-DD" — 기상하는 날 기준 */
  dateKey: string;
  /** 예) "월" (기상하는 날의 요일) */
  weekday: string;
  /** 예) "22:00 취침 · 07:00 기상 · 14:00 카페인 1.5잔(150mg) → 09:00 생화학" */
  text: string;
}

/**
 * #39 — 결과 화면 주간 요약. 밤(취침~기상) 하나를 하루로 보고, 그날 아침 기상하는 밤을
 * 기준으로 그날 카페인·시험을 붙인다(buildDayPlans와 같은 묶음 기준).
 * buildDayPlans와 달리 "요일)" 접두사 한 줄로 만들고 기상 시각도 본문에 함께 적는다.
 *
 * 요일은 기상하는 날(공부·시험이 있는 날) 기준으로 붙인다 — 취침 시각(전날 저녁)은 자정을
 * 넘겨 이 날로 이어지므로, 시험·카페인이 있는 날에 맞춰야 "화) … 09:00 생화학"이 어긋나지 않는다.
 */
export function buildDaySummaries(
  response: ScheduleCalculateResponse,
  request: ScheduleCalculateRequest | null,
): DaySummary[] {
  const { nights, caffeineDoses } = response.recommendedSchedule;

  return nights.map((night) => {
    const 그날 = kstDateKey(night.wakeTime);

    const 카페인 = caffeineDoses.filter((dose) => kstDateKey(dose.time) === 그날);
    const 시험 = (request?.exams ?? []).filter((exam) => kstDateKey(exam.examDateTime) === 그날);

    const 조각: string[] = [
      `${formatKstTime(night.bedTime)} 취침`,
      `${formatKstTime(night.wakeTime)} 기상`,
    ];
    for (const dose of 카페인) {
      조각.push(`${formatKstTime(dose.time)} 카페인 ${formatCups(dose.cups, dose.amountMg)}`);
    }

    const 앞부분 = 조각.join(' · ');
    const 뒷부분 = 시험
      .map((exam) => `${formatKstTime(exam.examDateTime)} ${exam.subject}`)
      .join(', ');

    return {
      dateKey: 그날,
      weekday: formatKstWeekday(night.wakeTime),
      text: 뒷부분 ? `${앞부분} → ${뒷부분}` : 앞부분,
    };
  });
}

/** 오늘(KST) 날짜 키 "YYYY-MM-DD" */
function todayKstKey(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: KST }).format(new Date());
}

/**
 * #27 — 캘린더에 넘길 표시 데이터.
 * rangeStart~rangeEnd는 스케줄이 걸친 기간(취침·기상·카페인·시험의 최소~최대 날짜)이라
 * 캘린더가 이 기간이 걸친 달만 그린다. marks는 시험일(밑줄)·스케줄 있는 날 표시용.
 */
export function buildCalendarData(
  response: ScheduleCalculateResponse,
  request: ScheduleCalculateRequest | null,
): { rangeStart: string; rangeEnd: string; marks: CalendarMark[] } {
  const { nights, caffeineDoses } = response.recommendedSchedule;
  const exams = request?.exams ?? [];

  const examDates = new Set(exams.map((exam) => kstDateKey(exam.examDateTime)));
  // "스케줄 있는 날" = 그날 아침 기상하는 밤이 있거나, 그날 카페인 섭취가 있는 날
  const scheduleDates = new Set<string>([
    ...nights.map((night) => kstDateKey(night.wakeTime)),
    ...caffeineDoses.map((dose) => kstDateKey(dose.time)),
  ]);

  // 기간 계산에는 취침 날짜(전날 저녁)까지 포함해서 첫날이 빠지지 않게 한다
  const allKeys = [
    ...nights.map((night) => kstDateKey(night.bedTime)),
    ...nights.map((night) => kstDateKey(night.wakeTime)),
    ...caffeineDoses.map((dose) => kstDateKey(dose.time)),
    ...exams.map((exam) => kstDateKey(exam.examDateTime)),
  ].sort();

  // 날짜 문자열이 하나도 없으면(빈 스케줄) 오늘이 든 달만 평범하게 보여준다
  const rangeStart = allKeys[0] ?? todayKstKey();
  const rangeEnd = allKeys.at(-1) ?? todayKstKey();

  const markDates = new Set<string>([...examDates, ...scheduleDates]);
  const marks: CalendarMark[] = [...markDates].map((date) => ({
    date,
    hasExam: examDates.has(date),
    hasSchedule: scheduleDates.has(date),
  }));

  return { rangeStart, rangeEnd, marks };
}

/**
 * #27 — 캘린더에서 특정 날짜를 눌렀을 때 시트에 보여줄 하루치 상세.
 * 그날 시험, 그날 아침 기상하는 밤(전날 취침 → 이 날 기상), 그날 카페인을 모아 포맷한다.
 */
export function buildDayDetail(
  response: ScheduleCalculateResponse,
  request: ScheduleCalculateRequest | null,
  dateKey: string,
): CalendarDayDetail {
  const { nights, caffeineDoses } = response.recommendedSchedule;
  const exams = request?.exams ?? [];

  const dayExams = exams
    .filter((exam) => kstDateKey(exam.examDateTime) === dateKey)
    .map((exam) => ({ subject: exam.subject, time: formatKstTime(exam.examDateTime) }));

  const night = nights.find((n) => kstDateKey(n.wakeTime) === dateKey);
  const sleep = night
    ? { bedTime: formatKstTime(night.bedTime), wakeTime: formatKstTime(night.wakeTime) }
    : null;

  const dayCaffeine = caffeineDoses
    .filter((dose) => kstDateKey(dose.time) === dateKey)
    .map((dose) => ({ time: formatKstTime(dose.time), cups: formatCups(dose.cups, dose.amountMg) }));

  return {
    dateLabel: formatKstDate(dateKey),
    exams: dayExams,
    sleep,
    caffeine: dayCaffeine,
  };
}

/** 결과 화면 맨 위 요약 문구 */
export interface ResultSummary {
  eyebrow: string;
  headline: string;
  subtext: string;
}

export function buildSummary(
  response: ScheduleCalculateResponse,
  request: ScheduleCalculateRequest | null,
): ResultSummary {
  const 첫밤 = response.recommendedSchedule.nights[0];
  const 첫카페인 = response.recommendedSchedule.caffeineDoses[0];
  const 시험들 = request?.exams ?? [];

  // 시험이 여러 개면 가장 늦은 시험까지가 이 스케줄의 범위다
  const 마지막시험 = 시험들
    .map((exam) => exam.examDateTime)
    .sort()
    .at(-1);

  // 첫 취침부터 마지막 시험까지가 이 스케줄이 적용되는 기간
  const eyebrow =
    첫밤 && 마지막시험
      ? `${formatKstDate(첫밤.bedTime)} ~ ${formatKstDate(마지막시험)} 스케줄`
      : '추천 스케줄';

  if (!첫밤) {
    return { eyebrow, headline: '추천 스케줄', subtext: '' };
  }

  const 카페인문구 = 첫카페인
    ? ` · ${formatKstTime(첫카페인.time)} 커피 ${formatCups(첫카페인.cups, 첫카페인.amountMg)}`
    : '';
  const 시험수문구 = 시험들.length > 1 ? `${시험들.length}개 시험 모두` : '시험';

  return {
    eyebrow,
    headline: `${formatKstDate(첫밤.bedTime)} ${formatKstTime(첫밤.bedTime)} 취침`,
    subtext: `→ ${formatKstDateTime(첫밤.wakeTime)} 기상${카페인문구} 시, ${시험수문구} 시작 시각 예측 각성도가 가장 높아요.`,
  };
}
