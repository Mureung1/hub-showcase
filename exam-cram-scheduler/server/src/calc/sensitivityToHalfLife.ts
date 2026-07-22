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

// 경구피임약은 카페인 대사를 늦춰 반감기를 약 2배로 늘린다고 알려져 있다.
// TODO: 출처 미확인 근사치(2026-07-22 결정 — 일단 2배로 두고, 논문 자료를 따로 확인한 뒤
// 값·표기 방식을 확정하기로 함). 확정 전까지 화면에 근거 문구는 노출하지 않는다.
export const ORAL_CONTRACEPTIVE_HALF_LIFE_MULTIPLIER = 2;

/** 경구피임약 복용 중이면 반감기를 늘려서 돌려준다. 아니면 받은 값 그대로. */
export function applyOralContraceptive(halfLifeHours: number, taking: boolean | undefined): number {
  return taking ? halfLifeHours * ORAL_CONTRACEPTIVE_HALF_LIFE_MULTIPLIER : halfLifeHours;
}
