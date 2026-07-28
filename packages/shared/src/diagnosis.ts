import type { WeatherCondition } from "./weather";

/** 특정 날씨 상태의 매출 영향. */
export interface ConditionImpact {
  condition: WeatherCondition;
  avgRevenue: number;
  /** 평상시(normalRevenue) 대비 편차 (예: -0.23 = -23%). */
  deltaPct: number;
  days: number;
}

/**
 * 매장의 날씨×매출 상관 진단 결과.
 * "이 가게는 비 오는 날 -23%" 같은 문구·프롬프트의 근거가 된다.
 *
 * 편차 기준은 baselineRevenue(전체 평균)가 아니라 normalRevenue(무강수 평균)다.
 * 전체 평균에는 나쁜 날씨 날이 이미 섞여 있어 기준선이 내려가고, 그만큼 하락폭이
 * 실제보다 완만하게 보인다. rainImpactPct와 deltaPct가 같은 기준을 쓰도록 통일한 것.
 */
export interface Diagnosis {
  /** 전체 평균 매출 (날씨 스냅샷이 없는 날도 포함). 표시·기록용. */
  baselineRevenue: number;
  /** 평상시 기준 매출 = 비/눈 안 오는 날 평균. 모든 편차 계산의 기준선. */
  normalRevenue: number;
  /** 비 오는 날 매출이 안 오는 날 대비 몇 % 인가 (예: -0.22). */
  rainImpactPct: number;
  /** 실측 표본이 부족해 업종 기본 계수로 추정했는지 여부. */
  estimated: boolean;
  /** 편차 계산에 실제로 쓴 표본 일수 (개입일을 뺐으면 뺀 뒤 기준). */
  sampleDays: number;
  /** 캠페인을 발송한 날(개입일) 수. 방어 효과 측정의 대상이 되는 날들. */
  campaignDays: number;
  /**
   * 개입일을 기준선에서 실제로 뺐는지.
   * false면 빼고 나니 표본이 모자라 되돌린 상태 — 진단이 캠페인 효과에 오염돼 있다는 뜻이다.
   */
  baselineExcludesCampaigns: boolean;
  /** 상태별 영향 (실측일 때만 채워짐). */
  byCondition: ConditionImpact[];
}
