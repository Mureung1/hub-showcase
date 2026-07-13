import { useMockResource } from "./useMockResource";
import { mockNoticeResult } from "../api/mocks/noticeResult";

export function useNoticeResult() {
  return useMockResource(mockNoticeResult);
}
