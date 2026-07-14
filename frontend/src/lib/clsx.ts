/** 의존성 없는 최소 클래스 병합 유틸 */
export function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
