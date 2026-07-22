import { useState } from "react";
import { COLORS, BACKGROUND_IMAGES } from "./shared/tokens";
import CreateMeetingModal from "./modals/CreateMeetingModal";
import MeetingListModal from "./modals/MeetingListModal";
import MyMeetingsModal from "./modals/MyMeetingsModal";

/**
 * 메인 홈 화면.
 * 레이아웃/크기는 Stitch export(code.html)의 실제 클래스를 그대로 따랐다
 * (grid-cols-3 고정, text-[64px]/[24px]/[18px], max-w-xl/3xl, px-16 pb-24 등).
 * 단, export에 정의가 빠져있던 4개 장식 클래스(border-thick, ink-shadow,
 * glass-panel, active-press)는 스크린샷에서 실제로 보이는 반투명 유리 카드 +
 * 부드러운 그림자 스타일로 대체했다.
 *
 * "모임 만들기 / 모임 목록 / 내 모임" 세 개의 진입 카드와 각각에 대응하는 모달을 포함한다.
 * 데이터 연동은 이후 App.jsx에서 각 on* 콜백 prop을 통해 주입한다.
 */
export default function MainPage({
  meetings = [],
  myMeetings = [],
  onCreateMeeting,
  onApplyMeeting,
  onCancelApplyMeeting,
  onEnterMeeting,
  onCancelMeeting,
  onDeleteMeeting,
  onRefreshMeetings,
}) {
  const [activeModal, setActiveModal] = useState(null); // "create" | "list" | "mine" | null

  const closeModal = () => setActiveModal(null);

  // "이미 신청한 모임" 여부는 myMeetings(실제 데이터)를 기준으로 판단 — 모달을 껐다 켜도 유지됨
  const appliedMeetingIds = new Set(myMeetings.map((m) => m.id));

  return (
    <div
      className="flex flex-col items-center justify-center relative min-h-screen w-full overflow-hidden"
      style={{ fontFamily: "'Jua', sans-serif" }}
    >
      {/* Notepad 버튼 */}
      <button
        className="fixed top-8 right-8 z-50 w-[52px] h-[52px] bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all active:scale-95"
        style={{
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
        }}
        aria-label="Notepad"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#FFFDF5]"
        >
          <path
            d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 7H17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 12H17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 17H13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 전체 화면 배경 */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src={BACKGROUND_IMAGES.campfireWide}
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      </div>

      {/* 메인 콘텐츠 — 모달이 열려있는 동안은 숨김 */}
      {!activeModal && (
        <main className="relative z-10 flex flex-col items-center text-center w-full h-full justify-center px-16 pb-24">
          <h1
            className="leading-tight tracking-tighter text-[72px] mt-4 mb-2"
            style={{
              color: "#FFFDF5",
              fontFamily: "'Jua', sans-serif",
              textShadow: "3px 3px 0px rgba(26,26,26,0.55)",
            }}
          >
            오늘모여
          </h1>

          <p
            className="text-[#FFFDF5]/95 backdrop-blur-md rounded-2xl leading-relaxed max-w-xl text-[18px] px-8 mb-8 py-4"
            style={{
              backgroundColor: "rgba(26,26,26,0.4)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            나만의 데일리 소모임을 진행해보세요.
          </p>

          <div className="grid grid-cols-3 w-full max-w-3xl gap-4">
            <ActionCard
              label="모임 만들기"
              onClick={() => setActiveModal("create")}
            />
            <ActionCard
              label="모임 목록"
              onClick={() => setActiveModal("list")}
            />
            <ActionCard label="내 모임" onClick={() => setActiveModal("mine")} />
          </div>
        </main>
      )}

      {/* 모달들 */}
      <CreateMeetingModal
        isOpen={activeModal === "create"}
        onClose={closeModal}
        onSubmit={(values) => {
          onCreateMeeting?.(values);
          closeModal();
        }}
      />
      <MeetingListModal
        isOpen={activeModal === "list"}
        onClose={closeModal}
        meetings={meetings}
        appliedMeetingIds={appliedMeetingIds}
        onApply={onApplyMeeting}
        onCancelApply={onCancelApplyMeeting}
        onRefresh={onRefreshMeetings}
      />
      <MyMeetingsModal
        isOpen={activeModal === "mine"}
        onClose={closeModal}
        meetings={myMeetings}
        onEnter={onEnterMeeting}
        onCancel={onCancelMeeting}
        onDelete={onDeleteMeeting}
      />
    </div>
  );
}

function ActionCard({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-6 py-6 rounded-2xl flex flex-col items-center justify-center gap-4 bg-white/20 backdrop-blur-sm hover:bg-[#FF5C00]/30 transition-all active:scale-[0.97]"
      style={{
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      <h3 className="text-[#FFFDF5] text-[24px] font-bold">{label}</h3>
    </button>
  );
}
