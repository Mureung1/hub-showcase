// content-as-data: 압력 레벨(0~4)에 대응하는 라벨/이모지.
// TaskCard(홈 카드)와 NudgeModal(개입 팝업)이 함께 쓰므로 컴포넌트 밖 공용 모듈로 둔다.
export const LEVEL_META = [
  { label: "시작 대기", face: "🙂" },
  { label: "Lv1 · 가벼운 알림", face: "🙂" },
  { label: "Lv2 · 마이크로태스크 제안", face: "😐" },
  { label: "Lv3 · 근거 기반 개입", face: "😟" },
  { label: "Lv4 · 마감 임박 경고", face: "🔥" },
];
