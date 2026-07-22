import { useEffect, useState } from "react";
import { COLORS } from "../shared/tokens";

const ROW_DIVIDER = "1px solid rgba(26,26,26,0.1)";

// 시작 시간 몇 분 전부터 "입장하기" 버튼으로 바뀌게 할지
const ENTER_WINDOW_MINUTES = 10;

/** "1시간"/"30분" 같은 문자열에서 숫자만 뽑아 "1시간 30분" 형태로 변환 (분은 2자리 고정) */
function formatDuration(hourLabel, minuteLabel) {
  const hour = parseInt(hourLabel, 10) || 0;
  const minute = parseInt(minuteLabel, 10) || 0;
  return `${hour}시간 ${String(minute).padStart(2, "0")}분`;
}

/** "HH:MM" 문자열을 오늘 날짜의 Date 객체로 변환 */
function todayAt(hhmm) {
  const [h, m] = (hhmm || "0:0").split(":").map((n) => parseInt(n, 10) || 0);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** 지금 시각이 시작 시간 기준 ENTER_WINDOW_MINUTES 이내(또는 이미 시작)인지 */
function isReadyToEnter(startTime, now) {
  const start = todayAt(startTime);
  return start.getTime() - now.getTime() <= ENTER_WINDOW_MINUTES * 60 * 1000;
}

/**
 * "내 모임" 모달 — 다른 두 모달(모임 만들기/모임 목록)과 동일한 톤으로 통일:
 * 얇은 구분선, 부드러운 그림자, 알약 버튼.
 *
 * 버튼 규칙:
 *  - 시작 시간 10분 전이 되면(또는 이미 시작했으면) 모두 "입장하기"로 바뀜 → onEnter
 *  - 아직 아니고, 내가 만든(host) 모임이면 "삭제하기" → onDelete (모임 목록/내 모임 양쪽에서 완전히 제거)
 *  - 아직 아니고, 참가자로 신청한 모임이면 "신청 취소" → onCancel (내 모임에서만 제거)
 *
 * props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - meetings: Array<{
 *      id: string,
 *      title: string,
 *      description: string,
 *      isHost: boolean,           // 내가 개설한 모임인지 여부
 *      startTime: string,        // 예: "20:00"
 *      durationHour: string,     // 예: "1시간"
 *      durationMinute: string,   // 예: "30분"
 *      currentCount: number,
 *      capacity: number,
 *    }>
 *  - onEnter: (meetingId: string) => void
 *  - onCancel: (meetingId: string) => void
 *  - onDelete: (meetingId: string) => void
 */
export default function MyMeetingsModal({
  isOpen,
  onClose,
  meetings = [],
  onEnter,
  onCancel,
  onDelete,
}) {
  // 시간 경과에 따라 "입장하기" 전환 여부를 주기적으로 다시 계산하기 위한 tick
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(new Date()), 15000); // 15초마다 재확인
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="내 모임"
    >
      <div
        className="w-full max-w-[640px] max-h-[85vh] rounded-3xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: COLORS.paperCream,
          boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
          fontFamily: "'Jua', sans-serif",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-[26px]"
              style={{ color: COLORS.campfireOrange }}
            >
              event_note
            </span>
            <h2 className="text-[20px] font-bold">내 모임</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div style={{ borderBottom: ROW_DIVIDER }} />

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 flex flex-col">
          {meetings.length === 0 ? (
            <p className="text-center py-10 opacity-50">
              참여 중인 모임이 없습니다. 모임 목록에서 신청해보세요.
            </p>
          ) : (
            meetings.map((meeting, idx) => {
              const readyToEnter = isReadyToEnter(meeting.startTime, now);
              const statusLabel = readyToEnter ? "진행중" : "대기 중";

              return (
                <div
                  key={meeting.id}
                  className="flex items-center gap-4 py-5"
                  style={{
                    borderBottom:
                      idx < meetings.length - 1 ? ROW_DIVIDER : "none",
                  }}
                >
                  <div className="flex-grow flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[17px] font-bold text-left">
                        {meeting.title}
                      </h3>
                      <span
                        className="px-2.5 py-0.5 text-[11px] font-bold rounded-full"
                        style={
                          readyToEnter
                            ? { backgroundColor: COLORS.campfireOrange, color: "#fff" }
                            : { backgroundColor: "#F0EEE6", color: COLORS.inkBlack }
                        }
                      >
                        {statusLabel}
                      </span>
                      {meeting.isHost && (
                        <span
                          className="px-2.5 py-0.5 text-[11px] font-bold rounded-full"
                          style={{ backgroundColor: "#EFE7DC", color: COLORS.inkBlack }}
                        >
                          내가 개설
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[14px] text-left"
                      style={{ color: COLORS.fadedInk }}
                    >
                      {meeting.description}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-[13px] opacity-70">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          schedule
                        </span>
                        시작시간 {meeting.startTime} (
                        {formatDuration(meeting.durationHour, meeting.durationMinute)}
                        )
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          group
                        </span>
                        {meeting.currentCount} / {meeting.capacity}명
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {readyToEnter ? (
                      <button
                        onClick={() => onEnter?.(meeting.id)}
                        className="px-5 py-2.5 text-white text-[15px] font-bold rounded-full transition-transform active:scale-[0.97]"
                        style={{
                          backgroundColor: COLORS.campfireOrange,
                          boxShadow: "0 4px 12px rgba(255,92,0,0.3)",
                        }}
                      >
                        입장하기
                      </button>
                    ) : meeting.isHost ? (
                      <button
                        onClick={() => onDelete?.(meeting.id)}
                        className="px-4 py-2 text-[14px] font-bold rounded-full hover:bg-black/5 transition-colors"
                        style={{ color: COLORS.error }}
                      >
                        삭제하기
                      </button>
                    ) : (
                      <button
                        onClick={() => onCancel?.(meeting.id)}
                        className="px-4 py-2 text-[14px] font-bold rounded-full hover:bg-black/5 transition-colors opacity-70"
                      >
                        신청 취소
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{
            backgroundColor: "#F5F4EC",
            borderTop: ROW_DIVIDER,
          }}
        >
          <p className="text-[13px]" style={{ color: COLORS.fadedInk }}>
            참여 중인 모임이 총 {meetings.length}개 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
