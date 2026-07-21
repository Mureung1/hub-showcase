import { useApiResource } from "./useApiResource";

export function useSchedulePublish(id) {
  return useApiResource(`/posts/${id}/suggested-time`);
}
