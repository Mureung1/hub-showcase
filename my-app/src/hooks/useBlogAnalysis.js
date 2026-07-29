import { useApiResource } from "./useApiResource";

export function useBlogAnalysis() {
  return useApiResource("/blog/analysis");
}
