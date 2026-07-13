// 계산_모델_리서치.md 1장 "Process C(일주기리듬)" (b) 5-하모닉 수식 그대로 구현
const HARMONIC_AMPLITUDES = [0.97, 0.22, 0.07, 0.03, 0.001]; // a1~a5
const TAU = 24; // 하루 주기(시간)

// Φ: 최저점이 새벽 4시경 오도록 맞춘 위상값. 논문에 고정값 없음 — 원래 각자 조정해서 쓰는 값(2026-07-13 확인).
// a1(기본음)만 고려한 계산은 최저점이 2.4시로 어긋나서, 5개 하모닉을 다 더한 상태로 직접 탐색해서 찾음
const PHASE = -Math.PI;

export function circadianRhythm(t: number): number {
  return HARMONIC_AMPLITUDES.reduce((sum, amplitude, index) => {
    const harmonicNumber = index + 1;
    return sum + amplitude * Math.sin((2 * Math.PI * harmonicNumber * t) / TAU + PHASE);
  }, 0);
}
