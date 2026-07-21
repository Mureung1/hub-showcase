import { useApiResource } from "./useApiResource";

export function useNoticeResult(id) {
  return useApiResource(`/posts/${id}`);
}
