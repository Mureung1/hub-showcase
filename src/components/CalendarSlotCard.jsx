import { formatDday } from "../lib/nudgeMessages";

// Lv4 전용 "캘린더에 추가" 카드 (wireframe.md 4번의 CalendarSlotCard).
// #43에서 캘린더 히스토리 뷰가 생겨 실제로 연결됨 — 클릭 시 onAddToCalendar(task)를
// 호출해 히스토리의 캘린더 뷰로 이동시킨다(#28은 정적 데모였음).
function CalendarSlotCard({ task, onAddToCalendar }) {
  return (
    <div className="calendar-slot-card">
      <p className="calendar-slot-title">
        <span aria-hidden="true">🗓️</span> 캘린더에 추가
      </p>
      <p className="calendar-slot-detail">
        <strong>{formatDday(task.deadline)}</strong> {task.title}
      </p>
      <button
        type="button"
        className="calendar-slot-btn"
        onClick={() => onAddToCalendar?.(task)}
      >
        캘린더에 추가 →
      </button>
    </div>
  );
}

export default CalendarSlotCard;
