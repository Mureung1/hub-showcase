import { useMockResource } from "./useMockResource";
import { mockInsight } from "../api/mocks/dashboard";

export function useInsights() {
  return useMockResource(mockInsight);
}
