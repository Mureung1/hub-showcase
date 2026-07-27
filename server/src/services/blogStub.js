// 조회(게시물 개수/최근 게시일 등) 실 연동은 Day 17로 이월 — 여기서는 상태 저장 없이
// 고정 mock 응답만 반환하는 스텁이다. blogId 연결(POST /connect)은 naverAuth.js가
// 실제로 처리한다.
export function getBlogAnalysis() {
  return {
    connected: true,
    postingCycle: "주 2회",
    tone: "친근하고 정중한 말투",
    commonPhrases: ["오늘도 방문해주셔서 감사합니다", "많은 사랑 부탁드립니다"],
    contentTypes: ["신메뉴 소개", "이벤트 안내", "일상 스토리"],
    postingPattern: "평일 오전 발행이 많음",
    analyzedAt: new Date().toISOString(),
  };
}
