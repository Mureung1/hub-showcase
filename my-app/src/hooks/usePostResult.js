import { useMockResource } from "./useMockResource";
import { mockPostResult } from "../api/mocks/postResult";

export function usePostResult() {
  return useMockResource(mockPostResult);
}
