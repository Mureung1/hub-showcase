import { useMockResource } from "./useMockResource";
import { mockSchedulePublish } from "../api/mocks/schedulePublish";

export function useSchedulePublish() {
  return useMockResource(mockSchedulePublish);
}
