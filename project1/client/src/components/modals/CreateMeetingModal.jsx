import { useEffect, useRef, useState } from "react";
import { COLORS } from "../shared/tokens";

const CATEGORY_OPTIONS = ["독서", "취미", "공부", "기타"];
// 시작 시간: 0시~24시, 1시간 단위 / 0분~50분, 10분 단위
const START_HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => `${i}시`);
const START_MINUTE_OPTIONS = ["0분", "10분", "20분", "30분", "40분", "50분"];
// 진행 시간: 0시간~6시간, 1시간 단위 (분 없음)
const DURATION_HOUR_OPTIONS = Array.from({ length: 7 }, (_, i) => `${i}시간`);
// 인원 수: 2명~8명, 1명 단위
const CAPACITY_OPTIONS = Array.from({ length: 7 }, (_, i) => `${i + 2}명`);

const FIELD_BORDER = "1px solid rgba(26,26,26,0.12)";

/**
 * "모임 만들기" 모달 — 스크린샷 스타일(얇은 테두리, 부드러운 그림자, 알약 모양 입력창)로 재구성.
 * 폼 상태는 내부에서 관리하고, 제출 시 onSubmit으로 값만 넘긴다.
 *
 * props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onSubmit: (formValues: {
 *      title: string,
 *      category: string,
 *      startHour: string,       // "0시" ~ "24시"
 *      startMinute: string,     // "0분" ~ "50분" (10분 단위)
 *      durationHour: string,    // "0시간" ~ "6시간"
 *      durationMinute: string,  // "0분" ~ "50분" (10분 단위)
 *      capacity: string,        // "2명" ~ "8명"
 *      description: string,
 *    }) => void
 */
export default function CreateMeetingModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("독서");
  const [startHour, setStartHour] = useState("20시");
  const [startMinute, setStartMinute] = useState("0분");
  const [durationHour, setDurationHour] = useState("1시간");
  const [durationMinute, setDurationMinute] = useState("0분");
  const [capacity, setCapacity] = useState("4명");
  const [description, setDescription] = useState("");

  // 모달이 열릴 때마다(닫혔다가 다시 열릴 때 포함) 입력값을 초기 상태로 리셋
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setCategory("독서");
      setStartHour("20시");
      setStartMinute("0분");
      setDurationHour("1시간");
      setDurationMinute("0분");
      setCapacity("4명");
      setDescription("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.({
      title,
      category,
      startHour,
      startMinute,
      durationHour,
      durationMinute,
      capacity,
      description,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="모임 만들기"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[440px] max-h-[88vh] rounded-3xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: COLORS.paperCream,
          boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
          fontFamily: "'Jua', sans-serif",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-center">
          <h2
            className="text-[20px] font-bold text-left"
            style={{ fontFamily: "'Jua', sans-serif" }}
          >
            모임 만들기
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div style={{ borderBottom: FIELD_BORDER }} />

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex flex-col gap-5">
          {/* 모임 이름 */}
          <div className="flex flex-col gap-2">
            <label className="text-[15px] font-bold text-left" htmlFor="meeting-title">
              모임 이름
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="어떤 모임인가요?"
              className="px-4 py-3 rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#FF5C00]"
              style={{ border: FIELD_BORDER }}
            />
          </div>

          {/* 카테고리 */}
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-bold text-left">카테고리</span>
            <div className="flex gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setCategory(opt)}
                  className={`px-4 py-2 rounded-full text-[14px] font-bold transition-colors ${
                    category === opt ? "text-white" : "hover:bg-black/10"
                  }`}
                  style={{
                    backgroundColor:
                      category === opt ? COLORS.campfireOrange : "#F0EEE6",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 설정 */}
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-bold text-left">시간 설정</span>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[12px] opacity-50 text-left">
                  시작 시간
                </label>
                <div className="flex gap-2">
                  <div className="flex-[0.75]">
                    <SelectField
                      value={startHour}
                      onChange={setStartHour}
                      options={START_HOUR_OPTIONS}
                      fullWidth
                    />
                  </div>
                  <div className="flex-[1.25]">
                    <SelectField
                      value={startMinute}
                      onChange={setStartMinute}
                      options={START_MINUTE_OPTIONS}
                      fullWidth
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[12px] opacity-50 text-left">진행 시간</label>
                <div className="flex gap-2">
                  <div className="flex-[0.75]">
                    <SelectField
                      value={durationHour}
                      onChange={setDurationHour}
                      options={DURATION_HOUR_OPTIONS}
                      fullWidth
                    />
                  </div>
                  <div className="flex-[1.25]">
                    <SelectField
                      value={durationMinute}
                      onChange={setDurationMinute}
                      options={START_MINUTE_OPTIONS}
                      fullWidth
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 인원 수 */}
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-bold text-left">인원 수</span>
            <SelectField
              value={capacity}
              onChange={setCapacity}
              options={CAPACITY_OPTIONS}
              fullWidth
            />
          </div>

          {/* 상세 설명 */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[15px] font-bold text-left"
              htmlFor="meeting-description"
            >
              상세 설명
            </label>
            <textarea
              id="meeting-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="모임에 대한 자세한 설명을 적어주세요."
              rows={4}
              className="px-4 py-3 rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#FF5C00] resize-none"
              style={{ border: FIELD_BORDER }}
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 mt-1 text-white text-[16px] font-bold rounded-full transition-transform active:scale-[0.98]"
            style={{
              backgroundColor: COLORS.campfireOrange,
              boxShadow: "0 8px 20px rgba(255,92,0,0.35)",
            }}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            개설하기
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * 값을 고르는 커스텀 드롭다운.
 * 네이티브 <select>는 목록 높이/스크롤을 우리가 제어할 수 없어서,
 * 클릭하면 하단에 목록이 펼쳐지고 6개 정도만 보이다가 스크롤되는 방식으로 직접 구현했다.
 */
function SelectField({ value, onChange, options, fullWidth }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={fullWidth ? "w-full" : ""}
      style={{ position: "relative" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-1 px-3 py-3 rounded-xl text-[15px] bg-white w-full text-left whitespace-nowrap"
        style={{ border: FIELD_BORDER }}
      >
        <span>{value}</span>
        <span className="material-symbols-outlined text-[18px] opacity-50">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div
          className="rounded-xl bg-white overflow-y-auto"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 20,
            border: FIELD_BORDER,
            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            maxHeight: "240px", // 항목 6개 정도 높이, 나머지는 스크롤
          }}
        >
          {options.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-[15px] hover:bg-black/5 transition-colors whitespace-nowrap"
              style={
                opt === value
                  ? { color: COLORS.campfireOrange, fontWeight: 700 }
                  : {}
              }
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
