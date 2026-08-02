export function formatStoreChange(
  value: number | null,
  unit: "개" | "곳" = "개",
): string {
  if (value === null) return "자료 없음";
  if (value === 0) return "변화 없음";

  return `${Math.abs(value).toLocaleString("ko-KR")}${unit} ${value > 0 ? "증가" : "감소"}`;
}
