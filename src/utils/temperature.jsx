import { Flame, Snowflake, Zap } from "lucide-react";

/** 0~100 온도값에 맞는 포인트 컬러를 반환 */
export function getTempColor(t) {
  if (t <= 30) return "#4FC3F7";
  if (t >= 80) return "#FF4D1F";
  return "#FFB020";
}

/** 0~100 온도값에 맞는 톤앤매너 라벨을 반환 */
export function getTempLabel(t) {
  if (t <= 30) return "감성 일기체";
  if (t >= 80) return "매운맛 풍자";
  return "균형 잡힌 유머";
}

/** 온도값에 맞는 아이콘 컴포넌트 */
export function TempIcon({ t, size = 12 }) {
  if (t <= 30) return <Snowflake size={size} />;
  if (t >= 80) return <Flame size={size} />;
  return <Zap size={size} />;
}
