import { useEffect, useState } from "react";
import { COLORS } from "../shared/tokens";

const CATEGORY_TABS = [
  { key: "all", label: "전체", icon: "apps" },
  { key: "reading", label: "독서", icon: "menu_book" },
  { key: "hobby", label: "취미", icon: "palette" },
  { key: "study", label: "공부", icon: "school" },
  { key: "etc", label: "기타", icon: "more_horiz" },
];

const CARD_BORDER = "1px solid rgba(26,26,26,0.1)";

/** "1시간"/"30분" 같은 문자열에서 숫자만 뽑아 "01:30" 형태로 변환 */
function formatHourMinute(hourLabel, minuteLabel) {
  const hour = parseInt(hourLabel, 10) || 0;
  const minute = parseInt(minuteLabel, 10) || 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "HH:MM" 문자열을 오늘 날짜의 Date 객체로 변환 */
function todayAt(hhmm) {
  const [h, m] = (hhmm || "0:0").split(":").map((n) => parseInt(n, 10) || 0);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** 시작 시간이 이미 지났는지 */
function isPastStart(startTime, now) {
  return todayAt(startTime).getTime() <= now.getTime();
}

/**
 * "모임 목록" 모달 — 스크린샷 스타일(왼쪽 카테고리 탭 레일 + 얇은 테두리 카드 목록)로 재구성.
 * 실제 목록 조회 API 연동 전까지는 더미 데이터를 props로 넘겨 렌더링한다.
 *
 * props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - meetings: Array<{
 *      id: string,
 *      category: "reading" | "hobby" | "study" | "etc",
 *      categoryLabel: string,
 *      title: string,
 *      description: string,
 *      startTime: string,
 *      durationHour: string,      // 예: "1시간"
 *      durationMinute: string,    // 예: "30분"
 *      currentCount: number,
 *      capacity: number,
 *    }>
 *  - appliedMeetingIds: Set<string>   // 이미 신청해서 내 모임에 있는 모임 id들 (부모의 실제 데이터 기준)
 *  - onApply: (meetingId: string) => void
 *  - onCancelApply: (meetingId: string) => void   // 신청완료 상태에서 "취소" 클릭
 *  - onRefresh: () => void
 */
export default function MeetingListModal({
  isOpen,
  onClose,
  meetings = [],
  appliedMeetingIds = new Set(),
  onApply,
  onCancelApply,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [now, setNow] = useState(() => new Date());

  // 모달이 열릴 때마다 카테고리 탭을 초기 상태로 리셋 (신청 여부는 실제 데이터 기준이라 리셋 대상 아님)
  useEffect(() => {
    if (isOpen) {
      setActiveTab("all");
      setNow(new Date());
    }
  }, [isOpen]);

  // 열려있는 동안 주기적으로 현재 시각을 갱신해 "시작 시간 지남" 여부를 다시 계산
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(new Date()), 30000); // 30초마다 재확인
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const upcoming = meetings.filter((m) => !isPastStart(m.startTime, now));
  const filtered =
    activeTab === "all"
      ? upcoming
      : upcoming.filter((m) => m.category === activeTab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="모임 목록"
    >
      <div
        className="w-full max-w-[820px] h-[80vh] rounded-3xl flex overflow-hidden relative"
        style={{
          backgroundColor: COLORS.paperCream,
          boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
          fontFamily: "'Jua', sans-serif",
        }}
      >
        {/* 닫기 버튼 — 모달 우측 상단 고정 */}
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 z-20 w-[34px] h-[34px] rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* 왼쪽: 카테고리 레일 */}
        <aside className="w-[160px] shrink-0 flex flex-col p-4 gap-1">
          <div className="mb-3 px-1">
            <h2
              className="text-[18px] font-bold text-left"
              style={{ fontFamily: "'Jua', sans-serif" }}
            >
              모임 목록
            </h2>
          </div>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-full text-[14px] font-bold transition-colors text-left ${
                activeTab === tab.key ? "text-white" : "hover:bg-black/5"
              }`}
              style={
                activeTab === tab.key
                  ? { backgroundColor: COLORS.campfireOrange }
                  : { color: COLORS.inkBlack }
              }
            >
              <span className="material-symbols-outlined text-[18px]">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}

          <div className="flex-1" />

          <button
            onClick={onRefresh}
            aria-label="새로고침"
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center hover:bg-black/5 transition-colors self-start"
            style={{ border: CARD_BORDER }}
          >
            <span className="material-symbols-outlined text-[18px]">
              refresh
            </span>
          </button>
        </aside>

        {/* 오른쪽: 카드 목록 */}
        <div
          className="flex-1 overflow-y-auto p-6 flex flex-col gap-4"
          style={{ borderLeft: CARD_BORDER }}
        >
          {filtered.length === 0 ? (
            <p className="text-center py-10 opacity-50">
              해당 카테고리에 열린 모임이 아직 없습니다.
            </p>
          ) : (
            filtered.map((meeting) => (
              <div
                key={meeting.id}
                className="rounded-2xl p-5 flex flex-col gap-2 bg-white"
                style={{
                  border: CARD_BORDER,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex justify-between items-start gap-3">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[12px] font-bold shrink-0"
                    style={{ backgroundColor: "#F0EEE6" }}
                  >
                    {meeting.categoryLabel}
                  </span>
                  <span className="flex items-center gap-1 text-[13px] opacity-60 shrink-0">
                    <span className="material-symbols-outlined text-[16px]">
                      group
                    </span>
                    {meeting.currentCount}/{meeting.capacity}
                  </span>
                </div>

                <h3 className="text-[17px] font-bold text-left">{meeting.title}</h3>
                <p
                  className="text-[14px] text-left"
                  style={{ color: COLORS.fadedInk }}
                >
                  {meeting.description}
                </p>

                <div className="flex items-center justify-between mt-2 gap-3">
                  <span className="flex items-center gap-1 text-[13px] opacity-70">
                    <span className="material-symbols-outlined text-[16px]">
                      schedule
                    </span>
                    시작 시간: {meeting.startTime} · 활동 시간:{" "}
                    {formatHourMinute(meeting.durationHour, meeting.durationMinute)}
                  </span>

                  {appliedMeetingIds.has(meeting.id) ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onCancelApply?.(meeting.id)}
                        className="px-5 py-2 text-[14px] font-bold rounded-full transition-transform active:scale-[0.97]"
                        style={{
                          backgroundColor: COLORS.paperCream,
                          border: CARD_BORDER,
                          color: COLORS.inkBlack,
                        }}
                      >
                        취소
                      </button>
                      <button
                        disabled
                        className="px-5 py-2 text-[14px] font-bold rounded-full cursor-default"
                        style={{ backgroundColor: "#D9D7D0", color: "#8A8880" }}
                      >
                        신청완료
                      </button>
                    </div>
                  ) : meeting.currentCount >= meeting.capacity ? (
                    <button
                      disabled
                      className="px-5 py-2 text-[14px] font-bold rounded-full shrink-0 cursor-default"
                      style={{ backgroundColor: "#D9D7D0", color: "#8A8880" }}
                    >
                      마감
                    </button>
                  ) : (
                    <button
                      onClick={() => onApply?.(meeting.id)}
                      className="px-5 py-2 text-white text-[14px] font-bold rounded-full shrink-0 transition-transform active:scale-[0.97]"
                      style={{
                        backgroundColor: COLORS.campfireOrange,
                        boxShadow: "0 4px 12px rgba(255,92,0,0.3)",
                      }}
                    >
                      신청하기
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
