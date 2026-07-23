export const inputCapabilities = [
  {
    id: "text",
    label: "텍스트 입력",
    status: "MVP",
    note: "목표, 실패 이유, 완료 기록의 기본 입력 방식",
  },
  {
    id: "voice",
    label: "음성 입력",
    status: "Adapter",
    note: "Web Speech API 또는 서버 STT로 교체 가능한 확장 슬롯",
  },
  {
    id: "gesture",
    label: "손 제스처",
    status: "Future Lab",
    note: "웹캠 권한과 성능 검증 후 우주 탐색에 연결",
  },
  {
    id: "keyboard",
    label: "키보드 단축키",
    status: "Adapter",
    note: "XP shell 테마의 데스크톱 조작감을 높이는 입력",
  },
];

export type GestureState = "open_hand" | "pinch" | "fist" | "lost_tracking";
export type GestureCommand = "hover_move" | "select" | "grab" | "no_op";

export function resolveGestureCommand(gesture: GestureState): GestureCommand {
  if (gesture === "open_hand") return "hover_move";
  if (gesture === "pinch") return "select";
  if (gesture === "fist") return "grab";
  return "no_op";
}
