import { useApiResource } from "./useApiResource";

export function useBrandProfile() {
  return useApiResource("/brand-profile");
}
