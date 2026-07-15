import { useState } from "react";
import MainStage from "../features/main/MainStage";
import CreateMeetingModal from "../features/meeting-create/CreateMeetingModal";

// activeOverlay: null | "list" | "dashboard" | "create" | "record"
// list / dashboard / record는 아직 미구현이라 지금은 "create"만 실제로 연결한다.

export default function MainPage() {
  const [activeOverlay, setActiveOverlay] = useState(null);

  function closeOverlay() {
    setActiveOverlay(null);
  }

  return (
    <>
      <div className="brand">
        오늘모여 <span>MAIN</span>
      </div>

      <MainStage activeOverlay={activeOverlay} onOpenOverlay={setActiveOverlay} />

      {activeOverlay === "create" && <CreateMeetingModal onClose={closeOverlay} />}

      {/* list, dashboard, record 오버레이는 다음 스프린트에서 구현 예정 (docs/roadmap.md 참고) */}
    </>
  );
}
