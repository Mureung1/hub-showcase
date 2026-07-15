import Bubble from "../../components/common/Bubble";

// onOpen: (key: "list" | "dashboard" | "create") => void
// list, dashboard는 아직 미구현 화면이므로 지금은 onOpen("create")만 실제로 연결된다.

export default function NavBubbles({ onOpen }) {
  return (
    <>
      <Bubble tailDirection="b" style={{ left: "38%", top: "41%" }} onClick={() => onOpen("dashboard")}>
        내 모임
      </Bubble>
      <Bubble tailDirection="b" style={{ left: "50%", top: "33%" }} onClick={() => onOpen("create")}>
        모임 생성
      </Bubble>
      <Bubble tailDirection="b" style={{ left: "62%", top: "41%" }} onClick={() => onOpen("list")}>
        모임 찾기
      </Bubble>
    </>
  );
}
