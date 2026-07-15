import { apiClient } from "../../api/client";

// 백엔드 연결 전까지는 이 함수가 실제로 호출되지 않는다.
// (docs/roadmap.md 3단계에서 POST /api/meetings 구현 후 연동)
export function createMeeting(meeting) {
  return apiClient.post("/api/meetings", meeting);
}
