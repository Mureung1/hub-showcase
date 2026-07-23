// #15 "POST /api/schedule/calculate 엔드포인트"
// 요청 검증 → DB 조회(#14 참고 테이블) → 계산 파이프라인(#8~#13) 연결 → 응답 포맷,
// 서비스_기술_지도.md 7.2에 정의된 순서 그대로.
import type { Request, Response } from "express";
import { buildMultiDayCandidates } from "../calc/multiDayCandidates.js";
import { searchMultiDaySchedule } from "../calc/multiDayLocalSearch.js";
import { buildAlertnessTimeline } from "../calc/alertnessTimeline.js";
import type { CaffeineDose } from "../calc/caffeineConcentration.js";
import { applyOralContraceptive, type CaffeineSensitivity } from "../calc/sensitivityToHalfLife.js";
import { buildExamTimeline } from "../timeline/examTimeline.js";
import { fromContinuousCoordinate, toContinuousCoordinate } from "../timeline/kstTime.js";
import { fetchDailyCaffeineLimitMg, fetchHalfLifeHours, type HealthProfile } from "../db/referenceData.js";

// #15 결정(2026-07-21, B): 시험일마다 카페인 후보 하나를 "기상 1시간 뒤"를 기준으로
// ±1시간(multiDayCandidates.ts 그리드) 범위에서 탐색한다. 기본 용량은 검증 스크립트들과
// 동일하게 200mg(근거 없는 근사치)로 둔다.
const CAFFEINE_ANCHOR_OFFSET_HOURS = 1;

// 그래프를 마지막 시험 시각에서 딱 끊으면 시험 직후 각성도가 내려가는 꼬리가 안 보여서
// 부자연스럽고, 마지막 시험 마커도 오른쪽 끝에 붙어 잘려 보인다. 표시용으로만 이만큼
// 뒤까지 더 그린다(최적화에는 영향 없음 — endTime은 buildAlertnessTimeline에만 쓰임).
const POST_EXAM_TAIL_HOURS = 3;

// #3(2026-07-22 결정) — 예전엔 200mg 고정이라 추천이 늘 "200mg"으로만 나왔고, 그 숫자에
// 근거도 없었다. 이제 용량도 탐색 대상으로 두되, 사용자가 실행할 수 있게 "잔" 단위로
// 고르게 한다. 기준 한 잔은 아이스 아메리카노 1잔 = 150mg(DRINK_PRESETS와 맞춤).
const CUP_MG = 150;
const CUP_OPTIONS = [0.5, 1, 1.5, 2];
const CANDIDATE_DOSE_MG_OPTIONS = CUP_OPTIONS.map((cups) => Math.round(cups * CUP_MG));
/** 탐색이 amountOptionsMg를 쓰므로 기준값은 후보 중 가운데(1잔)로 둔다 */
const DEFAULT_CANDIDATE_DOSE_MG = CUP_MG;

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

// #20 — 조정 화면 슬라이더로 "이 밤은 이 값으로 고정해서 다시 최적화" 요청을 표현한다.
// nightIndex는 응답 recommendedSchedule.nights[]/caffeineDoses[]와 같은 인덱스(0 = 오늘 밤).
interface NightOverrideInput {
  nightIndex: number;
  bedTime?: string;
  wakeTime?: string;
  caffeineTime?: string;
  caffeineAmountMg?: number;
}

interface ScheduleCalculateRequestBody {
  exams: ExamInput[];
  habitualBedTime: string;
  habitualWakeTime: string;
  todayCaffeineIntakes: CaffeineIntakeInput[];
  caffeineSensitivity: CaffeineSensitivity;
  healthProfile: HealthProfile;
  minSleepHours?: number;
  nightOverrides: NightOverrideInput[];
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
  // 경구피임약은 선택 항목(남성 선택 시 화면에서 아예 안 보냄) — 오면 boolean이어야 한다.
  if (hp.oralContraceptive !== undefined && typeof hp.oralContraceptive !== "boolean") {
    return { error: "healthProfile.oralContraceptive는 true/false여야 합니다." };
  }

  const todayCaffeineIntakes = Array.isArray(b.todayCaffeineIntakes) ? b.todayCaffeineIntakes : [];
  for (const intake of todayCaffeineIntakes as Record<string, unknown>[]) {
    if (!intake || typeof intake.mg !== "number" || typeof intake.consumedAt !== "string") {
      return { error: "todayCaffeineIntakes[].mg(숫자)·consumedAt(ISO 날짜)이 필요합니다." };
    }
  }

  const minSleepHours = typeof b.minSleepHours === "number" ? b.minSleepHours : undefined;

  const nightOverridesRaw = Array.isArray(b.nightOverrides) ? b.nightOverrides : [];
  for (const override of nightOverridesRaw as Record<string, unknown>[]) {
    if (!override || typeof override.nightIndex !== "number" || !Number.isInteger(override.nightIndex) || override.nightIndex < 0) {
      return { error: "nightOverrides[].nightIndex는 0 이상의 정수여야 합니다." };
    }
    if (override.bedTime !== undefined && (typeof override.bedTime !== "string" || Number.isNaN(new Date(override.bedTime).getTime()))) {
      return { error: "nightOverrides[].bedTime은 유효한 ISO 날짜 문자열이어야 합니다." };
    }
    if (override.wakeTime !== undefined && (typeof override.wakeTime !== "string" || Number.isNaN(new Date(override.wakeTime).getTime()))) {
      return { error: "nightOverrides[].wakeTime은 유효한 ISO 날짜 문자열이어야 합니다." };
    }
    if (override.caffeineTime !== undefined && (typeof override.caffeineTime !== "string" || Number.isNaN(new Date(override.caffeineTime).getTime()))) {
      return { error: "nightOverrides[].caffeineTime은 유효한 ISO 날짜 문자열이어야 합니다." };
    }
    if (override.caffeineAmountMg !== undefined && (typeof override.caffeineAmountMg !== "number" || override.caffeineAmountMg < 0)) {
      return { error: "nightOverrides[].caffeineAmountMg는 0 이상의 숫자여야 합니다." };
    }
  }

  return {
    data: {
      exams: b.exams as ExamInput[],
      habitualBedTime: b.habitualBedTime,
      habitualWakeTime: b.habitualWakeTime,
      todayCaffeineIntakes: todayCaffeineIntakes as CaffeineIntakeInput[],
      caffeineSensitivity: b.caffeineSensitivity,
      healthProfile: hp as unknown as HealthProfile,
      minSleepHours,
      nightOverrides: nightOverridesRaw as NightOverrideInput[],
    },
  };
}

export async function handleCalculateSchedule(req: Request, res: Response): Promise<void> {
  const validation = validateRequestBody(req.body);
  if ("error" in validation) {
    res.status(400).json({ error: validation.error });
    return;
  }
  const { exams, habitualBedTime, habitualWakeTime, todayCaffeineIntakes, caffeineSensitivity, healthProfile, minSleepHours, nightOverrides } =
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

  for (const override of nightOverrides) {
    if (override.nightIndex >= timeline.numNights) {
      res.status(400).json({ error: `nightOverrides[].nightIndex(${override.nightIndex})가 시험기간 밤 개수(${timeline.numNights})를 벗어났습니다.` });
      return;
    }
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

  // 민감도로 정해진 반감기에 경구피임약 보정을 곱한다(#16, 2026-07-22 결정).
  halfLifeHours = applyOralContraceptive(halfLifeHours, healthProfile.oralContraceptive);

  // #22 — night[k]가 이어지는 날(day k+1)에 시험이 있으면, 그 시험 시작 시각보다
  // 늦게 깨는 기상 후보는 애초에 말이 안 되므로 latestWakeTime으로 걸러낸다.
  const nights = Array.from({ length: timeline.numNights }, (_, k) => {
    const dayStart = 24 * (k + 1);
    const dayEnd = 24 * (k + 2);
    const examTimesThisDay = timeline.examTimes.filter((t) => t >= dayStart && t < dayEnd);
    return {
      habitualBedTime: timeline.habitualBedTime + 24 * k,
      habitualWakeTime: timeline.habitualWakeTime + 24 * (k + 1),
      latestWakeTime: examTimesThisDay.length > 0 ? Math.min(...examTimesThisDay) : undefined,
    };
  });

  const plannedDoses = nights.map((night) => ({
    dose: { time: night.habitualWakeTime + CAFFEINE_ANCHOR_OFFSET_HOURS, amountMg: DEFAULT_CANDIDATE_DOSE_MG },
    earliestTime: night.habitualWakeTime,
  }));

  const candidates = buildMultiDayCandidates({
    nights,
    plannedDoses,
    amountOptionsMg: CANDIDATE_DOSE_MG_OPTIONS,
  });

  // #20 — 후보 그리드 중 잠근 밤의 축만 값 하나짜리 배열로 바꿔치기한다. 로컬 탐색은
  // 축 길이가 1이면 그 축을 절대 옮기지 않으므로(neighborIndex), 알고리즘은 그대로 두고
  // "이 밤은 이 값 고정, 나머지는 재최적화"를 얻을 수 있다.
  for (const override of nightOverrides) {
    const { nightIndex } = override;
    if (override.bedTime !== undefined) {
      candidates.nightBedOptions[nightIndex] = [toContinuousCoordinate(nowIso, override.bedTime)];
    }
    if (override.wakeTime !== undefined) {
      candidates.nightWakeOptions[nightIndex] = [toContinuousCoordinate(nowIso, override.wakeTime)];
    }
    if (override.caffeineTime !== undefined) {
      const amountMg = candidates.doseAmountOptions[nightIndex][0];
      candidates.doseOptions[nightIndex] = [{ time: toContinuousCoordinate(nowIso, override.caffeineTime), amountMg }];
    }
    if (override.caffeineAmountMg !== undefined) {
      candidates.doseAmountOptions[nightIndex] = [override.caffeineAmountMg];
    }
  }

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
    // #3 — 한도를 채점에 반영해야 "많이 마셔라"와 "한도 초과 경고"가 동시에 나오지 않는다
    dailyLimitMg,
  });

  // 기획서.md 6.3 "추천/조정된 스케줄의 총 카페인이 개인별 한도를 넘으면 경고 문구를 표시한다"
  // — 실제 날짜(연속 좌표를 24로 나눈 몫, 0 = 오늘)로 묶어서 그날 마신 전부를 합산한다.
  // 예전에는 밤 번호로 묶었는데, 카페인은 그 밤의 "다음날 아침"에 마시므로 오늘 이미 마신
  // 양이 내일 추천분과 합산되어 없는 초과를 경고했다(2026-07-22 수정).
  const dailyTotals = new Map<number, number>();
  for (const dose of [...fixedDoses, ...best.doses]) {
    const day = Math.floor(dose.time / 24);
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + dose.amountMg);
  }

  const warnings: string[] = [];
  for (const [day, totalMg] of [...dailyTotals.entries()].sort((a, b) => a[0] - b[0])) {
    if (totalMg > dailyLimitMg) {
      const 라벨 = day === 0 ? '오늘' : `${day}일 뒤`;
      warnings.push(`${라벨} 카페인 섭취량(${totalMg}mg)이 안전 한도(${dailyLimitMg}mg)를 초과합니다.`);
    }
  }

  const timelinePoints = buildAlertnessTimeline({
    habitualBedTime: timeline.habitualBedTime,
    habitualWakeTime: timeline.habitualWakeTime,
    nights: best.nights,
    doses: [...fixedDoses, ...best.doses],
    bodyWeightKg: healthProfile.weightKg,
    halfLifeHours,
    startTime: 0,
    // 마지막 시험 뒤로 꼬리를 조금 더 그려, 시험 직후 각성도가 내려가는 흐름까지 보이게 한다
    endTime: Math.max(...timeline.examTimes) + POST_EXAM_TAIL_HOURS,
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
        // 화면은 mg 대신 잔 수로 보여준다(#3) — mg는 안전 한도 경고에서 계속 쓰이므로 함께 내려준다
        cups: Math.round((dose.amountMg / CUP_MG) * 10) / 10,
      })),
    caffeineReference: {
      cupMg: CUP_MG,
      label: '아이스 아메리카노 1잔',
    },
    },
    warnings,
  });
}
