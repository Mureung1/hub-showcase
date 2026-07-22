// #16 — 정보 입력 화면이 들고 있는 값을, 서버(POST /api/schedule/calculate)가 받는 모양으로 바꾼다.
// 화면은 날짜·시각을 따로 받는 게 편하고 서버는 하나로 붙은 시각이 편해서 모양이 다르다.
// 변환 규칙이 화면 코드에 섞이면 검증하기 어려워서 별도 파일로 뺐다.
import type { CaffeineSensitivity, ScheduleCalculateRequest } from '../../api/calculateSchedule';

export interface Exam {
  subject: string;
  date: string;
  time: string;
  studyHours: number;
}

export interface CaffeineIntake {
  label: string;
  mg: number;
  /**
   * 오늘 몇 시에 마셨는지 — "HH:MM"(24시간제). 예전에는 '방금' 같은 표시용 문구였는데,
   * 서버가 실제 시각을 필요로 해서 입력받는 값으로 바꿨다(2026-07-22).
   * 날짜는 "오늘 이미 섭취한 카페인"이라 오늘로 고정한다.
   */
  time: string;
}

/** 정보 입력 화면이 들고 있는 값 전체 */
export interface InputFormState {
  exams: Exam[];
  bedtime: string;
  wakeTime: string;
  caffeineIntakes: CaffeineIntake[];
  sensitivity: CaffeineSensitivity;
  /** 입력칸을 다 지우면 ''가 된다(0이 남으면 "021"처럼 입력되므로) — 계산 전에 검증한다 */
  age: number | '';
  weightKg: number | '';
  gender: '여성' | '남성';
  pregnant: boolean;
  oralContraceptive: boolean;
  heartCondition: boolean;
  anxiety: boolean;
  minSleepHours: number;
}

// 서버(timeline/kstTime.ts)가 한국 시간을 기준으로 계산하므로, 사용자가 고른 시각은
// 한국 시간으로 해석해야 한다. 브라우저가 켜져 있는 지역에 좌우되지 않도록
// "+09:00"을 직접 붙여서 해석한다(해외에서 접속해도 시험 시각은 한국 기준).
const KST_OFFSET = '+09:00';

/** "2026-07-24" + "10:00" -> "2026-07-24T01:00:00.000Z" (한국시간 10시로 해석) */
export function toIsoFromKst(date: string, time: string): string {
  return new Date(`${date}T${time}:00${KST_OFFSET}`).toISOString();
}

/** 오늘 날짜를 한국 기준 "YYYY-MM-DD"로. 카페인은 날짜 없이 시각만 받으므로 여기서 붙인다. */
export function todayInKst(now: Date = new Date()): string {
  // 'sv-SE' 로케일이 "YYYY-MM-DD" 형태를 준다
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now);
}

/**
 * 계산으로 넘어가도 되는 입력인지 확인한다.
 * 문제가 있으면 사용자에게 보여줄 문구를, 없으면 null을 돌려준다.
 *
 * 날짜·시각이 비어 있으면 toIsoFromKst가 "Invalid Date"를 만들어 서버가 400을 주는데,
 * 그러면 처리중 화면까지 갔다가 실패한다. 넘어가기 전에 여기서 막는다(#16).
 */
export function validateInputForm(form: InputFormState): string | null {
  if (form.exams.length === 0) {
    return '시험을 최소 1개 추가해주세요.';
  }

  for (const exam of form.exams) {
    if (!exam.date || !exam.time) {
      const 이름 = exam.subject || '이름 없는 시험';
      return `"${이름}"의 날짜와 시각을 입력해주세요.`;
    }
  }

  if (form.age === '' || form.age <= 0) {
    return '나이를 입력해주세요.';
  }
  if (form.weightKg === '' || form.weightKg <= 0) {
    return '체중을 입력해주세요.';
  }

  return null;
}

/**
 * 화면 값 -> 서버 요청 바디.
 *
 * - 시험: date + time을 합쳐 examDateTime(ISO)로
 * - 카페인: 오늘 날짜 + time을 합쳐 consumedAt(ISO)로
 * - 이름이 다른 것들(bedtime -> habitualBedTime 등)은 이름만 바꿔 담는다
 * - 흩어져 있는 건강 정보는 healthProfile 하나로 묶는다
 * - gender는 서버가 안 쓰므로 보내지 않는다(2026-07-21 결정).
 *   경구피임약은 여성 선택일 때만 의미가 있어 그때만 담는다.
 */
export function buildScheduleRequest(form: InputFormState): ScheduleCalculateRequest {
  const today = todayInKst();

  return {
    exams: form.exams.map((exam) => ({
      subject: exam.subject,
      examDateTime: toIsoFromKst(exam.date, exam.time),
      remainingStudyHours: exam.studyHours,
    })),
    habitualBedTime: form.bedtime,
    habitualWakeTime: form.wakeTime,
    todayCaffeineIntakes: form.caffeineIntakes.map((intake) => ({
      label: intake.label,
      mg: intake.mg,
      consumedAt: toIsoFromKst(today, intake.time),
    })),
    caffeineSensitivity: form.sensitivity,
    healthProfile: {
      // validateInputForm을 먼저 통과했다면 ''가 아니다
      age: Number(form.age),
      weightKg: Number(form.weightKg),
      pregnant: form.gender === '여성' ? form.pregnant : false,
      heartCondition: form.heartCondition,
      anxiety: form.anxiety,
      ...(form.gender === '여성' ? { oralContraceptive: form.oralContraceptive } : {}),
    },
    minSleepHours: form.minSleepHours,
  };
}
