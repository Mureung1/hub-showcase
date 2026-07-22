// #15 — #14가 만든 Supabase 참고 테이블에서 실제 값을 조회한다. sensitivityToHalfLife.ts·
// dailyCaffeineLimit.ts의 하드코딩 값은 검증 스크립트가 DB 없이도 계속 돌아갈 수 있게
// 그대로 남겨두고(2주차 자산), 실제 API 응답에는 이 파일의 DB 조회 결과를 쓴다.
import { supabase } from "./supabaseClient.js";
import type { CaffeineSensitivity } from "../calc/sensitivityToHalfLife.js";

export async function fetchHalfLifeHours(sensitivity: CaffeineSensitivity): Promise<number> {
  const { data, error } = await supabase
    .from("sensitivity_halflife")
    .select("half_life_hours")
    .eq("sensitivity", sensitivity)
    .single();

  if (error || !data) {
    throw new Error(`sensitivity_halflife 조회 실패(${sensitivity}): ${error?.message ?? "데이터 없음"}`);
  }
  return data.half_life_hours as number;
}

export interface HealthProfile {
  age: number;
  weightKg: number;
  pregnant: boolean;
  heartCondition: boolean;
  anxiety: boolean;
  /** 경구피임약 복용 여부. 안전 한도에는 안 쓰고 반감기 보정에만 쓴다(#16, 2026-07-22) */
  oralContraceptive?: boolean;
}

// dailyCaffeineLimit.ts의 나이 구간 분류와 동일한 기준(기획서.md 6.3, 2026-07-15 결정)
function ageConditionKey(age: number): string {
  if (age < 12) return "child";
  if (age <= 19) return "minor";
  return "adult";
}

/** 여러 조건이 겹치면 그중 가장 엄격한(가장 낮은) 한도 하나만 적용한다(dailyCaffeineLimit.ts와 동일). */
export async function fetchDailyCaffeineLimitMg(profile: HealthProfile): Promise<number> {
  const conditionKeys: string[] = [ageConditionKey(profile.age)];
  if (profile.pregnant) conditionKeys.push("pregnant");
  if (profile.heartCondition) conditionKeys.push("heart_condition");
  if (profile.anxiety) conditionKeys.push("anxiety");

  const { data, error } = await supabase
    .from("safety_limits")
    .select("condition_key, daily_limit_mg, mg_per_kg")
    .in("condition_key", conditionKeys);

  if (error || !data || data.length === 0) {
    throw new Error(`safety_limits 조회 실패: ${error?.message ?? "데이터 없음"}`);
  }

  const candidateLimits = data.map((row) =>
    row.mg_per_kg != null ? Math.min(row.daily_limit_mg, row.mg_per_kg * profile.weightKg) : row.daily_limit_mg,
  );

  return Math.min(...candidateLimits);
}
