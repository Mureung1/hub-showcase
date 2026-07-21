import { useApiResource } from "./useApiResource";

export function usePostResult(id) {
  return useApiResource(`/posts/${id}`);
}
