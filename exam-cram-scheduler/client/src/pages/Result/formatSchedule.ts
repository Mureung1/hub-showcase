// #18 — 서버 응답의 ISO 시각을 화면에 보여줄 한국어 라벨로 바꾸고,
// 밤(취침~기상)·카페인·시험을 "하루" 단위로 묶는다.
// 서버는 시각만 주고 과목명은 안 주므로, 요청(request)의 시험 목록과 날짜로 짝을 맞춘다.
import type { ScheduleCalculateRequest, ScheduleCalculateResponse } from '../../api/calculateSchedule';

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

/** 화면에 한 줄로 그릴 하루치 스케줄 */
export interface DayPlan {
  /** 예) "월 05:30 기상" */
  title: string;
  /** 예) "00:30 취침 · 06:00 카페인 200mg → 09:00 세포생물학" */
  subtitle: string;
}

/**
 * 응답 + 요청을 합쳐 날짜별 줄 목록을 만든다.
 *
 * 밤 하나가 하루의 시작(기상)을 정하므로 밤을 기준으로 묶고,
 * 같은 날(한국 기준)에 있는 카페인·시험을 붙인다.
 */
export function buildDayPlans(
  response: ScheduleCalculateResponse,
  request: ScheduleCalculateRequest | null,
): DayPlan[] {
  const { nights, caffeineDoses } = response.recommendedSchedule;

  return nights.map((night) => {
    const 그날 = kstDateKey(night.wakeTime);

    const 카페인 = caffeineDoses.filter((dose) => kstDateKey(dose.time) === 그날);
    const 시험 = (request?.exams ?? []).filter((exam) => kstDateKey(exam.examDateTime) === 그날);

    const 조각: string[] = [`${formatKstTime(night.bedTime)} 취침`];

    for (const dose of 카페인) {
      조각.push(`${formatKstTime(dose.time)} 커피 ${formatCups(dose.cups, dose.amountMg)}`);
    }

    const 앞부분 = 조각.join(' · ');
    const 뒷부분 = 시험
      .map((exam) => `${formatKstTime(exam.examDateTime)} ${exam.subject}`)
      .join(', ');

    return {
      title: `${formatKstDateTime(night.wakeTime)} 기상`,
      subtitle: 뒷부분 ? `${앞부분} → ${뒷부분}` : 앞부분,
    };
  });
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
