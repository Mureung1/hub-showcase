import { useApiResource } from "./useApiResource";

export function useBriefing() {
  return useApiResource("/briefing/today");
}
