import { useApiResource } from "./useApiResource";

export function usePosts() {
  return useApiResource("/posts?status=published");
}
