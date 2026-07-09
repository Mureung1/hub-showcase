import { useMockResource } from "./useMockResource";
import { mockBriefing } from "../api/mocks/dashboard";

export function useBriefing() {
  return useMockResource(mockBriefing);
}
