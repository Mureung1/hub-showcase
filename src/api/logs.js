const MOCK_LOGS = [
  {
    id: 3,
    timestamp: "2026-07-15T11:05:00+09:00",
    detections: ["기업 기밀"],
    action: "blocked",
  },
  {
    id: 2,
    timestamp: "2026-07-15T10:20:00+09:00",
    detections: [],
    action: "pass",
  },
  {
    id: 1,
    timestamp: "2026-07-15T10:12:00+09:00",
    detections: ["전화번호", "이메일"],
    action: "masked",
  },
];

// 목업 구현. 백엔드(/v1/logs)가 준비되면 client.get("/logs")로 교체한다.
export async function fetchLogs() {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_LOGS;
}
