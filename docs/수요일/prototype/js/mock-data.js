/* =========================================================
   PREFER 프로토타입 — 목업 데이터 (하드코딩, 실제 저장/AI 연동 없음)
   classic <script>로 로드되어 전역에 바로 노출된다.
   ========================================================= */

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/* 사용자 경험 흐름 순서를 반영한 실제 파일명. 화면 이동은 항상 이 상수를 통해서만 한다. */
const PAGE = {
  landing: "1.기본 화면.html",
  hub: "2.약속 허브 화면.html",
  vote: "3.투표 화면.html",
  voteConfirm: "4.AI 해석 결과 확인 화면.html",
  voteDone: "5.투표 완료 화면.html",
  results: "6.추천 결과 화면.html",
  final: "7.최종 확정 결과 화면.html",
};

const mockMeeting = {
  title: "팀 프로젝트 회의",
  startDate: "2026-07-13",
  endDate: "2026-07-22",
  startTime: "09:00",
  endTime: "21:00",
  status: "collecting", // collecting | closed | recommended | finalized
  deadline: "2026-07-19T23:59",
  totalParticipants: 5,
  submittedCount: 3,
  creatorName: "서연",
  joinLink: "https://example.com/m/abc123",
};

const mockParticipants = [
  { name: "허영", submitted: true },
  { name: "민수", submitted: true },
  { name: "서연", submitted: true },
  { name: "지훈", submitted: false },
  { name: "유진", submitted: false },
];

// 동점 예시 포함: 1순위가 두 슬롯 공유
const mockCandidates = [
  { rank: 1, date: "2026-07-16", time: "18:00", availableCount: 5, preferredCount: 3, undesiredCount: 0,
    reason: "전원 참석 가능, 3명 선호, 비선호 없음합니다." },
  { rank: 1, date: "2026-07-16", time: "18:30", availableCount: 5, preferredCount: 3, undesiredCount: 0,
    reason: "전원 참석 가능, 3명 선호, 비선호 없음합니다." },
  { rank: 2, date: "2026-07-17", time: "17:30", availableCount: 5, preferredCount: 4, undesiredCount: 1,
    reason: "전원 참석 가능, 4명 선호, 1명 비선호합니다." },
  { rank: 3, date: "2026-07-14", time: "10:00", availableCount: 4, preferredCount: 2, undesiredCount: 1,
    reason: "4명 참석 가능, 2명 선호, 1명 비선호합니다." },
];

const mockFinalResult = {
  date: "2026-07-16",
  time: "18:00",
  rationale: "전원 참석 가능하며 선호 응답이 가장 많아 최종 확정되었습니다.",
};

/** "2026-07-16" -> "7/16 (목)" */
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_LABELS[d.getDay()]})`;
}

/** "2026-07-16" -> "2026년 7월 16일 목요일" */
function formatDateLong(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_LABELS[d.getDay()]}요일`;
}

/** startDate~endDate 사이 모든 날짜 문자열 배열 */
function buildDateAxis(startDate, endDate) {
  const axis = [];
  let cur = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    axis.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return axis;
}

/** startTime~endTime(HH:MM) 사이 30분 간격 시간 배열 (endTime 미포함, 슬롯 시작 기준) */
function buildTimeAxis(startTime, endTime) {
  const axis = [];
  let [h, m] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const endMinutes = endH * 60 + endM;
  while (h * 60 + m < endMinutes) {
    axis.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { m -= 60; h += 1; }
  }
  return axis;
}

/** 00:00~23:30 30분 간격 전체 시간 목록 (TimeRangePicker용) */
function buildFullDayTimeAxis() {
  const axis = [];
  for (let h = 0; h < 24; h++) {
    axis.push(`${String(h).padStart(2, "0")}:00`);
    axis.push(`${String(h).padStart(2, "0")}:30`);
  }
  return axis;
}

/** 쿼리파라미터 읽기 헬퍼 */
function getProtoState() {
  const params = new URLSearchParams(location.search);
  return {
    role: params.get("role") === "admin" ? "admin" : "participant",
    status: params.get("status") || mockMeeting.status,
  };
}

function withProtoQuery(path, overrides) {
  const state = Object.assign(getProtoState(), overrides || {});
  const params = new URLSearchParams();
  params.set("role", state.role);
  params.set("status", state.status);
  params.set("loggedIn", "1");
  return `${path}?${params.toString()}`;
}
