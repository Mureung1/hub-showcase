import type { WeatherCondition } from "./weather";

/** 특정 날씨 상태의 매출 영향. */
export interface ConditionImpact {
  condition: WeatherCondition;
  avgRevenue: number;
  /** 전체 평균(baseline) 대비 편차 (예: -0.18 = -18%). */
  deltaPct: number;
  days: number;
}

/**
 * 매장의 날씨×매출 상관 진단 결과.
 * "이 가게는 비 오는 날 -18%" 같은 문구·프롬프트의 근거가 된다.
 */
export interface Diagnosis {
  /** 기준 매출 (전체 평균). */
  baselineRevenue: number;
  /** 비 오는 날 매출이 안 오는 날 대비 몇 % 인가 (예: -0.22). */
  rainImpactPct: number;
  /** 실측 표본이 부족해 업종 기본 계수로 추정했는지 여부. */
  estimated: boolean;
  /** 날씨 스냅샷이 있는 표본 일수. */
  sampleDays: number;
  /** 상태별 영향 (실측일 때만 채워짐). */
  byCondition: ConditionImpact[];
}
