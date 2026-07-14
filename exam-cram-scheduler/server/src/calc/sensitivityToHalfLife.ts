// 계산_모델_리서치.md 2.1 "반감기(half-life) — 카페인 민감도 입력값과 연결"
// 정보입력 화면의 문자열 선택지를 실제 계산에 쓰는 시간(시) 숫자로 바꿔주는 매핑.
// 라벨은 InputPage.tsx의 실제 Segmented 옵션(둔감/보통/예민)과 맞춤(2026-07-14 확인 후 수정).
// 나중에 Supabase sensitivity_halflife 테이블로 교체될 자리(3주차 작업).
export type CaffeineSensitivity = "둔감" | "보통" | "예민";

const HALF_LIFE_HOURS: Record<CaffeineSensitivity, number> = {
  둔감: 4,
  보통: 5,
  예민: 7,
};

export function sensitivityToHalfLife(sensitivity: CaffeineSensitivity): number {
  return HALF_LIFE_HOURS[sensitivity];
}
