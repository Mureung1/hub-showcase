import fireImg from "../../assets/fire.png";
import AccumTime from "./AccumTime";
import NavBubbles from "./NavBubbles";

// activeOverlay: null | "list" | "dashboard" | "create" | "record"
// overlay가 열려 있으면 메인 내비게이션 말풍선/누적시간은 숨기고 모닥불만 노출한다.

export default function MainStage({ activeOverlay, onOpenOverlay }) {
  const isMain = activeOverlay === null;

  return (
    <div className="stage">
      <img className="anchor fire-img" style={{ left: "50%", top: "53%" }} src={fireImg} alt="모닥불" />

      {isMain && <AccumTime />}
      {isMain && <NavBubbles onOpen={onOpenOverlay} />}
    </div>
  );
}
