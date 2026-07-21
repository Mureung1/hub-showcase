// #15 "POST /api/schedule/calculate 엔드포인트"
// 요청 검증 → DB 조회(#14 참고 테이블) → 계산 파이프라인(#8~#13) 연결 → 응답 포맷,
// 서비스_기술_지도.md 7.2에 정의된 순서 그대로.
import type { Request, Response } from "express";
import { buildMultiDayCandidates } from "../calc/multiDayCandidates.js";
import { searchMultiDaySchedule } from "../calc/multiDayLocalSearch.js";
import { buildAlertnessTimeline } from "../calc/alertnessTimeline.js";
import type { CaffeineDose } from "../calc/caffeineConcentration.js";
import type { CaffeineSensitivity } from "../calc/sensitivityToHalfLife.js";
import { buildExamTimeline } from "../timeline/examTimeline.js";
import { fromContinuousCoordinate, toContinuousCoordinate } from "../timeline/kstTime.js";
import { fetchDailyCaffeineLimitMg, fetchHalfLifeHours, type HealthProfile } from "../db/referenceData.js";

// #15 결정(2026-07-21, B): 시험일마다 카페인 후보 하나를 "기상 1시간 뒤"를 기준으로
// ±1시간(multiDayCandidates.ts 그리드) 범위에서 탐색한다. 기본 용량은 검증 스크립트들과
// 동일하게 200mg(근거 없는 근사치)로 둔다.
const CAFFEINE_ANCHOR_OFFSET_HOURS = 1;
const DEFAULT_CANDIDATE_DOSE_MG = 200;

interface ExamInput {
  subject: string;
  examDateTime: string;
  remainingStudyHours?: number;
}

interface CaffeineIntakeInput {
  label?: string;
  mg: number;
  consumedAt: string;
}

interface ScheduleCalculateRequestBody {
  exams: ExamInput[];
  habitualBedTime: string;
  habitualWakeTime: string;
  todayCaffeineIntakes: CaffeineIntakeInput[];
  caffeineSensitivity: CaffeineSensitivity;
  healthProfile: HealthProfile;
  minSleepHours?: number;
}

const HH_MM = /^\d{1,2}:\d{2}$/;

function validateRequestBody(body: unknown): { data: ScheduleCalculateRequestBody } | { error: string } {
  const b = body as Record<string, unknown> | null | undefined;
  if (!b || typeof b !== "object") return { error: "요청 바디가 없습니다." };

  if (!Array.isArray(b.exams) || b.exams.length === 0) {
    return { error: "exams는 1개 이상의 배열이어야 합니다." };
  }
  for (const exam of b.exams as Record<string, unknown>[]) {
    if (!exam || typeof exam.subject !== "string" || !exam.subject) {
      return { error: "exams[].subject(문자열)는 필수입니다." };
    }
    if (typeof exam.examDateTime !== "string" || Number.isNaN(new Date(exam.examDateTime).getTime())) {
      return { error: "exams[].examDateTime은 유효한 ISO 날짜 문자열이어야 합니다." };
    }
  }

  if (typeof b.habitualBedTime !== "string" || !HH_MM.test(b.habitualBedTime)) {
    return { error: "habitualBedTime은 HH:MM 형식이어야 합니다." };
  }
  if (typeof b.habitualWakeTime !== "string" || !HH_MM.test(b.habitualWakeTime)) {
    return { error: "habitualWakeTime은 HH:MM 형식이어야 합니다." };
  }
  if (b.caffeineSensitivity !== "둔감" && b.caffeineSensitivity !== "보통" && b.caffeineSensitivity !== "예민") {
    return { error: "caffeineSensitivity는 둔감/보통/예민 중 하나여야 합니다." };
  }

  const hp = b.healthProfile as Record<string, unknown> | undefined;
  if (
    !hp ||
    typeof hp.age !== "number" ||
    typeof hp.weightKg !== "number" ||
    typeof hp.pregnant !== "boolean" ||
    typeof hp.heartCondition !== "boolean" ||
    typeof hp.anxiety !== "boolean"
  ) {
    return { error: "healthProfile(age, weightKg, pregnant, heartCondition, anxiety)이 올바르지 않습니다." };
  }

  const todayCaffeineIntakes = Array.isArray(b.todayCaffeineIntakes) ? b.todayCaffeineIntakes : [];
  for (const intake of todayCaffeineIntakes as Record<string, unknown>[]) {
    if (!intake || typeof intake.mg !== "number" || typeof intake.consumedAt !== "string") {
      return { error: "todayCaffeineIntakes[].mg(숫자)·consumedAt(ISO 날짜)이 필요합니다." };
    }
  }

  const minSleepHours = typeof b.minSleepHours === "number" ? b.minSleepHours : undefined;

  return {
    data: {
      exams: b.exams as ExamInput[],
      habitualBedTime: b.habitualBedTime,
      habitualWakeTime: b.habitualWakeTime,
      todayCaffeineIntakes: todayCaffeineIntakes as CaffeineIntakeInput[],
      caffeineSensitivity: b.caffeineSensitivity,
      healthProfile: hp as unknown as HealthProfile,
      minSleepHours,
    },
  };
}

export async function handleCalculateSchedule(req: Request, res: Response): Promise<void> {
  const validation = validateRequestBody(req.body);
  if ("error" in validation) {
    res.status(400).json({ error: validation.error });
    return;
  }
  const { exams, habitualBedTime, habitualWakeTime, todayCaffeineIntakes, caffeineSensitivity, healthProfile, minSleepHours } =
    validation.data;

  const nowIso = new Date().toISOString();

  let timeline;
  try {
    timeline = buildExamTimeline({
      nowIso,
      habitualBedTime,
      habitualWakeTime,
      examDateTimesIso: exams.map((exam) => exam.examDateTime),
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  let halfLifeHours: number;
  let dailyLimitMg: number;
  try {
    [halfLifeHours, dailyLimitMg] = await Promise.all([
      fetchHalfLifeHours(caffeineSensitivity),
      fetchDailyCaffeineLimitMg(healthProfile),
    ]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return;
  }

  const nights = Array.from({ length: timeline.numNights }, (_, k) => ({
    habitualBedTime: timeline.habitualBedTime + 24 * k,
    habitualWakeTime: timeline.habitualWakeTime + 24 * (k + 1),
  }));

  const plannedDoses = nights.map((night) => ({
    dose: { time: night.habitualWakeTime + CAFFEINE_ANCHOR_OFFSET_HOURS, amountMg: DEFAULT_CANDIDATE_DOSE_MG },
    earliestTime: night.habitualWakeTime,
  }));

  const candidates = buildMultiDayCandidates({ nights, plannedDoses });

  const fixedDoses: CaffeineDose[] = todayCaffeineIntakes.map((intake) => ({
    time: toContinuousCoordinate(nowIso, intake.consumedAt),
    amountMg: intake.mg,
  }));

  const best = searchMultiDaySchedule({
    habitualBedTime: timeline.habitualBedTime,
    habitualWakeTime: timeline.habitualWakeTime,
    candidates,
    examTimes: timeline.examTimes,
    bodyWeightKg: healthProfile.weightKg,
    halfLifeHours,
    minSleepHours,
    fixedDoses,
  });

  // 기획서.md 6.3 "추천/조정된 스케줄의 총 카페인이 개인별 한도를 넘으면 경고 문구를 표시한다"
  // — 날짜별로 그날 이미 마신 것(0일차만 해당) + 그날 추천된 양을 합쳐서 한도와 비교한다.
  const totalTodayMg = todayCaffeineIntakes.reduce((sum, intake) => sum + intake.mg, 0);
  const warnings: string[] = [];
  nights.forEach((_, i) => {
    const consumedTodayMg = i === 0 ? totalTodayMg : 0;
    const recommendedMg = best.doses[i]?.amountMg ?? 0;
    const totalMg = consumedTodayMg + recommendedMg;
    if (totalMg > dailyLimitMg) {
      warnings.push(`${i + 1}일차 카페인 섭취량(${totalMg}mg)이 안전 한도(${dailyLimitMg}mg)를 초과합니다.`);
    }
  });

  const timelinePoints = buildAlertnessTimeline({
    habitualBedTime: timeline.habitualBedTime,
    habitualWakeTime: timeline.habitualWakeTime,
    nights: best.nights,
    doses: [...fixedDoses, ...best.doses],
    bodyWeightKg: healthProfile.weightKg,
    halfLifeHours,
    startTime: 0,
    endTime: Math.max(...timeline.examTimes),
  });

  res.status(200).json({
    alertnessTimeline: timelinePoints.map((point) => ({
      time: fromContinuousCoordinate(nowIso, point.time),
      score: point.score,
    })),
    recommendedSchedule: {
      nights: best.nights.map((night) => ({
        bedTime: fromContinuousCoordinate(nowIso, night.bedTime),
        wakeTime: fromContinuousCoordinate(nowIso, night.wakeTime),
      })),
      caffeineDoses: best.doses.map((dose) => ({
        time: fromContinuousCoordinate(nowIso, dose.time),
        amountMg: dose.amountMg,
      })),
    },
    warnings,
  });
}
