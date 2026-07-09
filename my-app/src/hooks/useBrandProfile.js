import { useMockResource } from "./useMockResource";
import { mockBrandProfile } from "../api/mocks/dashboard";

export function useBrandProfile() {
  return useMockResource(mockBrandProfile);
}
