// data/periodTimes.js
// 교시(period) → 실제 시각 매핑표. "교시당 균일하게 N시간"이라고 계산하지 않고,
// 교시마다 실제 시작/종료 시각을 표로 정의해서 강의 길이가 제각각이어도(1시간/4시간 등)
// 여러 교시를 이어붙이는 방식으로 정확히 표현할 수 있게 한다.
export const periodTimes = [
  { period: 1, start: "09:00", end: "10:30" },
  { period: 2, start: "10:30", end: "12:00" },
  { period: 3, start: "13:30", end: "15:00" },
  { period: 4, start: "15:00", end: "16:30" },
  { period: 5, start: "16:30", end: "18:00" },
];

export function getPeriodTime(period) {
  const found = periodTimes.find((p) => p.period === period);
  if (!found) throw new Error(`정의되지 않은 교시: ${period}`);
  return found;
}
