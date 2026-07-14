import type { Requirement } from "./types";

/**
 * 적합도 색상 규칙 — 디자인.md 2.3
 *   85%+ success · 60~84% primary · 40~59% warning · 40% 미만 danger
 * 이 파일이 유일한 출처(single source of truth)다. 색상을 바꾸려면 여기만 고친다.
 */
export type FitTone = "success" | "primary" | "warning" | "danger";

export function fitTone(score: number): FitTone {
  if (score >= 85) return "success";
  if (score >= 60) return "primary";
  if (score >= 40) return "warning";
  return "danger";
}

export function fitLabel(score: number): string {
  if (score >= 85) return "매우 높음";
  if (score >= 60) return "높음";
  if (score >= 40) return "보통";
  return "낮음";
}

/** 미터 채움 색 (Tailwind 클래스) */
export const FILL_CLASS: Record<FitTone, string> = {
  success: "bg-success",
  primary: "bg-primary",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** 요구조건 충족 상태 → 배지 */
export function fulfillmentBadge(f: number): {
  tone: "success" | "warning" | "danger";
  label: string;
} {
  if (f >= 1) return { tone: "success", label: "충족" };
  if (f > 0) return { tone: "warning", label: "부분 충족" };
  return { tone: "danger", label: "미충족" };
}

/** 기획서 4.1: 점수 = Σ(가중치 × 충족도) */
export function calcFitScore(reqs: Requirement[]): number {
  const sum = reqs.reduce((acc, r) => acc + r.weight * r.fulfillment, 0);
  return Math.round(sum * 100);
}
