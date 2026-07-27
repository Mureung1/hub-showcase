// #24 — 프론트에서 서버 계산 엔진(POST /api/schedule/calculate)을 부르는 함수.
// 요청·응답 타입은 server/src/routes/scheduleCalculate.ts와 같은 모양으로 맞춰 적어둔다.
// (server/와 client/는 별개 프로젝트라 서버 타입을 직접 import할 수 없음 —
//  서버 쪽 응답 모양이 바뀌면 이 파일도 같이 고쳐야 한다.)

/** 시험 한 개. examDateTime은 ISO 날짜 문자열(예: "2026-07-25T09:00:00.000Z") */
export interface ExamInput {
  subject: string;
  examDateTime: string;
  remainingStudyHours?: number;
}

/** 오늘 이미 마신 카페인 한 잔 */
export interface CaffeineIntakeInput {
  label?: string;
  mg: number;
  consumedAt: string;
}

export type CaffeineSensitivity = '둔감' | '보통' | '예민';

export interface HealthProfile {
  age: number;
  weightKg: number;
  pregnant: boolean;
  heartCondition: boolean;
  anxiety: boolean;
  /** 경구피임약 복용 여부. 여성 선택일 때만 보낸다(반감기 2배 보정에 쓰임) */
  oralContraceptive?: boolean;
}

// #20 — 조정 화면에서 특정 밤(night)의 취침/기상/카페인을 사용자가 정한 값으로 고정하고
// 나머지는 다시 최적화해달라는 요청. nightIndex는 응답 recommendedSchedule.nights[]/
// caffeineDoses[]와 같은 인덱스(서버 server/src/routes/scheduleCalculate.ts와 이름 맞춤).
export interface NightOverrideInput {
  nightIndex: number;
  bedTime?: string;
  wakeTime?: string;
  caffeineTime?: string;
  caffeineAmountMg?: number;
}

/** 서버로 보내는 요청 바디 전체 */
export interface ScheduleCalculateRequest {
  exams: ExamInput[];
  /** 평소 취침 시각, "HH:MM" */
  habitualBedTime: string;
  /** 평소 기상 시각, "HH:MM" */
  habitualWakeTime: string;
  todayCaffeineIntakes: CaffeineIntakeInput[];
  caffeineSensitivity: CaffeineSensitivity;
  healthProfile: HealthProfile;
  minSleepHours?: number;
  nightOverrides?: NightOverrideInput[];
}

/** 각성도 그래프의 점 하나. time은 ISO 날짜 문자열 */
export interface AlertnessPoint {
  time: string;
  score: number;
}

export interface RecommendedNight {
  bedTime: string;
  wakeTime: string;
}

export interface RecommendedDose {
  time: string;
  amountMg: number;
  /** 기준 음료(caffeineReference) 몇 잔에 해당하는지. 화면에는 이 값을 보여준다(#3) */
  cups: number;
}

/** 잔 수의 기준이 되는 음료 */
export interface CaffeineReference {
  cupMg: number;
  label: string;
}

/** 서버가 돌려주는 응답 전체 */
export interface ScheduleCalculateResponse {
  alertnessTimeline: AlertnessPoint[];
  recommendedSchedule: {
    nights: RecommendedNight[];
    caffeineDoses: RecommendedDose[];
    caffeineReference: CaffeineReference;
  };
  warnings: string[];
}

/**
 * 스케줄 계산을 서버에 요청한다.
 *
 * fetch는 서버가 400·500을 줘도 "응답을 받았다"는 이유로 성공 처리하기 때문에,
 * 여기서 res.ok를 직접 확인해서 진짜 실패로 바꿔 던진다. 그래야 부르는 쪽이
 * try/catch 하나로 실패 분기를 탈 수 있다(#24 완료 기준).
 */
export async function calculateSchedule(
  request: ScheduleCalculateRequest,
): Promise<ScheduleCalculateResponse> {
  // #30 — 개발 환경에선 VITE_API_BASE_URL이 비어 있어 상대경로('/api/...')로 나가고,
  // vite.config.ts의 프록시가 이를 :4000으로 중계한다. 배포 환경에선 이 값에 Render 서버
  // 주소가 들어가서 절대 URL('https://…/api/…')로 완성돼 다른 도메인의 BE로 직접 닿는다.
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${base}/api/schedule/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    // 서버는 실패 시 { error: "..." } 를 준다. 다만 프록시 오류 등으로 JSON이
    // 아닐 수도 있어서, 파싱 실패는 삼키고 상태 코드만으로 메시지를 만든다.
    let message = `스케줄 계산에 실패했습니다. (HTTP ${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // 응답 본문이 JSON이 아니면 기본 메시지를 그대로 쓴다
    }
    throw new Error(message);
  }

  return (await res.json()) as ScheduleCalculateResponse;
}
