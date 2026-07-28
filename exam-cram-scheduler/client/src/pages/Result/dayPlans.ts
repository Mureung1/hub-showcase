// 보관용(현재 미사용) — 2026-07-28 #39에서 결과 화면을 WeekSchedule(buildDaySummaries)로
// 바꾸면서 이 함수의 유일한 사용처(ResultPage의 '날짜별 추천 스케줄' 리스트)가 사라졌다.
// 삭제하지 않고 남겨둔다: 조정(adjust) 화면 등에서 "요일 05:30 기상 / 취침·카페인·시험" 형태의
// 한 줄 요약을 다시 쓸 수 있어서다. 포맷 헬퍼는 formatSchedule.ts 것을 그대로 재사용한다.
import type { ScheduleCalculateRequest, ScheduleCalculateResponse } from '../../api/calculateSchedule';
import { formatCups, formatKstDateTime, formatKstTime, kstDateKey } from './formatSchedule';

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
