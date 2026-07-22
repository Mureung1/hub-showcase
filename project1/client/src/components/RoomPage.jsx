import { useEffect, useState } from "react";
import { COLORS, BACKGROUND_IMAGES } from "./shared/tokens";

const ROOM_FONT = "'Jua', sans-serif";

// 타이머가 0이 된 뒤에도 이 시간(초)만큼은 방을 계속 열어두고, 지나면 자동으로 나가기 처리한다.
const GRACE_PERIOD_SECONDS = 5 * 60;

const GLASS_CARD_STYLE = {
  backgroundColor: "rgba(255, 253, 245, 0.75)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  fontFamily: ROOM_FONT,
};

/**
 * 모임 진행(Room) 화면.
 * - 배경은 별도의 fixed 레이어로 분리되어 리사이즈와 무관하게 항상 화면 전체를 채운다.
 * - 우측 패널(참가자/미디어설정/채팅)은 화면 전체를 덮는 fixed 레이어 위에서 justify-end로
 *   우측 정렬되어 있어, 창을 늘리거나 줄여도 항상 우측에 붙은 채 세로 크기만 따라 변한다.
 * - 나가기 버튼도 fixed로 좌측 하단에 고정.
 * - 모든 텍스트 요소에 Jua 폰트를 명시적으로 지정해 상속 여부와 무관하게 항상 적용되도록 했다.
 * - 타이머는 실제 시계(실시간) 기준으로 계산한다: 아직 시작 시간 전이면 전체 진행 시간에서
 *   멈춰있고, 시작 시간이 되는 순간부터 줄어들기 시작한다. 일찍 입장해도 카운트다운이 미리
 *   시작되지 않는다.
 * - 타이머가 0이 되면(=실제 종료 시각을 지나면) 배경이 "불 꺼진" 이미지로 바뀌고, 그 상태로
 *   5분(GRACE_PERIOD_SECONDS)이 지나면 더 이상 유효하지 않은 방으로 보고 onExit을 자동 호출한다.
 *
 * props:
 *  - participants: Array<{ id: string, name: string, isHost?: boolean }>
 *  - messages: Array<{ id: string, sender: string, time: string, text: string, isMine?: boolean, isSystem?: boolean }>
 *  - startTimestamp: number    // 모임 실제 시작 시각 (Date.now() 기준 epoch ms)
 *  - durationSeconds: number   // 모임 진행 시간(초)
 *  - onSendMessage: (text: string) => void
 *  - onExit: () => void
 *  - onToggleMute: () => void
 *  - isMuted: boolean
 */
export default function RoomPage({
  participants = [],
  messages = [],
  startTimestamp = Date.now(),
  durationSeconds = 45 * 60,
  onSendMessage,
  onExit,
  onToggleMute,
  isMuted = false,
}) {
  const [draft, setDraft] = useState("");
  // 1초마다 화면을 다시 그리기 위한 tick (실제 값은 매번 Date.now() 기준으로 새로 계산)
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const endTimestamp = startTimestamp + durationSeconds * 1000;
  const now = Date.now();

  let displaySeconds;
  let isFireOut;
  let overtimeSeconds;

  if (now < startTimestamp) {
    // 아직 시작 시간 전 — 전체 진행 시간에서 멈춰있음
    displaySeconds = durationSeconds;
    isFireOut = false;
    overtimeSeconds = 0;
  } else if (now < endTimestamp) {
    // 진행 중 — 실시간으로 감소
    displaySeconds = Math.ceil((endTimestamp - now) / 1000);
    isFireOut = false;
    overtimeSeconds = 0;
  } else {
    // 종료 시각을 지남 — 0에서 멈추고, 경과 시간을 유예 시간으로 사용
    displaySeconds = 0;
    isFireOut = true;
    overtimeSeconds = Math.floor((now - endTimestamp) / 1000);
  }

  // 유예 시간(5분)을 넘기면 더 이상 유효한 방이 아니므로 자동으로 나가기 처리
  useEffect(() => {
    if (overtimeSeconds >= GRACE_PERIOD_SECONDS) {
      onExit?.();
    }
  }, [overtimeSeconds, onExit]);

  const hoursLabel = String(Math.floor(displaySeconds / 3600)).padStart(2, "0");
  const minutesLabel = String(Math.floor((displaySeconds % 3600) / 60)).padStart(2, "0");
  const secondsLabel = String(displaySeconds % 60).padStart(2, "0");

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSendMessage?.(text);
    setDraft("");
  };

  return (
    <main className="h-screen w-full overflow-hidden relative">
      {/* 배경 (고정 레이어 — 리사이즈와 무관하게 항상 화면 전체를 채움) */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src={
            isFireOut
              ? BACKGROUND_IMAGES.campfireRoomExtinguished
              : BACKGROUND_IMAGES.campfireRoom
          }
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: "center bottom" }}
        />
      </div>

      {/* 나가기 버튼 — 좌측 하단 고정 */}
      <div className="fixed bottom-6 left-6 z-20">
        <button
          onClick={onExit}
          title="나가기"
          className="w-[56px] h-[56px] flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-lg transition-colors active:scale-95"
          style={{
            border: "1px solid rgba(255,255,255,0.25)",
            boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
            color: COLORS.paperCream,
          }}
        >
          <span className="material-symbols-outlined text-[32px]">logout</span>
        </button>
      </div>

      {/* 타이머 */}
      <div
        className="fixed z-10 flex items-center justify-center"
        style={{ bottom: "80px", left: "calc(25% + 20px)" }}
      >
        <span
          className="text-[#FFFDF5]"
          style={{
            fontFamily: "'Space Mono', ui-monospace, monospace",
            fontSize: "27px",
            lineHeight: 1.3,
            textShadow: "2px 2px 0px rgba(26,26,26,0.5)",
          }}
        >
          [{hoursLabel}:{minutesLabel}:{secondsLabel}]
        </span>
      </div>

      {/* 우측 패널: 참가자 / 미디어 설정 / 채팅 — 화면 전체를 덮는 fixed 레이어 위에서
          justify-end로 우측 정렬. 리사이즈해도 항상 우측에 붙어있고 세로 길이만 반응한다. */}
      <div className="fixed inset-0 z-10 flex justify-end items-stretch p-6 pointer-events-none">
        <div
          className="pointer-events-auto flex flex-col gap-4 h-full"
          style={{ width: "min(480px, calc(100vw - 48px))" }}
        >
        {/* 참가자 카드 */}
        <div className="rounded-2xl p-5 flex flex-col shrink-0" style={GLASS_CARD_STYLE}>
          <h2 className="text-[20px] font-bold flex items-center gap-2 mb-4" style={{ fontFamily: ROOM_FONT }}>
            <span
              className="material-symbols-outlined"
              style={{ color: COLORS.campfireOrange }}
            >
              group
            </span>
            참가자 ({participants.length})
          </h2>
          <div className="flex flex-wrap gap-2 overflow-y-auto">
            {participants.map((p) => (
              <div
                key={p.id}
                className={`px-3 py-1 rounded-full text-[15px] font-bold flex items-center gap-1 ${
                  p.isHost ? "text-white" : "bg-white/60 hover:bg-white/80"
                }`}
                style={{
                  fontFamily: ROOM_FONT,
                  ...(p.isHost ? { backgroundColor: COLORS.campfireOrange } : {}),
                }}
              >
                {p.isHost && (
                  <span className="material-symbols-outlined text-sm">
                    stars
                  </span>
                )}
                {p.isHost ? "방장" : p.name}
              </div>
            ))}
          </div>
        </div>

        {/* 미디어 설정 카드 */}
        <div
          className="rounded-2xl p-4 flex items-center justify-between shrink-0"
          style={GLASS_CARD_STYLE}
        >
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ color: COLORS.campfireOrange }}
            >
              volume_up
            </span>
            <h3 className="text-[20px] font-bold" style={{ fontFamily: ROOM_FONT }}>
              미디어 설정
            </h3>
          </div>
          <button
            onClick={onToggleMute}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[15px] font-bold bg-white/70 hover:bg-white/90 transition-colors active:scale-[0.97]"
            style={{ fontFamily: ROOM_FONT }}
          >
            <span className="material-symbols-outlined">
              {isMuted ? "volume_off" : "volume_up"}
            </span>
            <span>{isMuted ? "음소거 해제" : "음소거"}</span>
          </button>
        </div>

        {/* 채팅 카드 */}
        <div
          className="rounded-2xl p-5 flex flex-col flex-1 min-h-0 relative overflow-hidden"
          style={GLASS_CARD_STYLE}
        >
          <h2 className="text-[20px] font-bold flex items-center gap-2 mb-4" style={{ fontFamily: ROOM_FONT }}>
            <span
              className="material-symbols-outlined"
              style={{ color: COLORS.campfireOrange }}
            >
              forum
            </span>
            실시간 채팅
          </h2>

          {/* 채팅 히스토리 */}
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 pb-4 scroll-smooth">
            {messages.map((m) =>
              m.isSystem ? (
                <div key={m.id} className="flex flex-col items-start gap-1">
                  <span className="text-[12px] opacity-50 ml-2" style={{ fontFamily: ROOM_FONT }}>
                    시스템
                  </span>
                  <p
                    className="text-[12px] italic"
                    style={{ color: COLORS.campfireOrange, fontFamily: ROOM_FONT }}
                  >
                    {m.text}
                  </p>
                </div>
              ) : (
                <div
                  key={m.id}
                  className={`flex flex-col gap-1 ${
                    m.isMine ? "items-end" : "items-start"
                  }`}
                >
                  <span
                    className={`text-[12px] opacity-50 ${
                      m.isMine ? "mr-2" : "ml-2"
                    }`}
                    style={{ fontFamily: ROOM_FONT }}
                  >
                    {m.isMine ? "나" : m.sender} • {m.time}
                  </span>
                  <div
                    className={`p-3 max-w-[85%] text-[16px] ${
                      m.isMine
                        ? "rounded-tl-xl rounded-bl-xl rounded-br-xl text-white"
                        : "rounded-tr-xl rounded-bl-xl rounded-br-xl bg-white/70"
                    }`}
                    style={{
                      fontFamily: ROOM_FONT,
                      ...(m.isMine
                        ? {
                            backgroundColor: COLORS.campfireOrange,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }
                        : { boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }),
                    }}
                  >
                    <p>{m.text}</p>
                  </div>
                </div>
              )
            )}
          </div>

          {/* 입력창 */}
          <form
            onSubmit={handleSend}
            className="mt-4 pt-4"
            style={{ borderTop: "1px solid rgba(26,26,26,0.1)" }}
          >
            <div className="relative">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                type="text"
                className="w-full rounded-xl p-4 pr-12 focus:outline-none text-[16px] bg-white/80"
                style={{ border: "1px solid rgba(26,26,26,0.1)", fontFamily: ROOM_FONT }}
              />
              <button
                type="submit"
                aria-label="보내기"
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-[#FF5C00] transition-colors"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </main>
  );
}
