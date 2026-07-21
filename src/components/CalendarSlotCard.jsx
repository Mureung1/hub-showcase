import { formatDday } from "../lib/nudgeMessages";

// Lv4 전용 "캘린더에 추가" 정적 카드 (wireframe.md 4번의 CalendarSlotCard).
// #28 기준 정적 데모 카드만 구현한다 — 실제 캘린더 히스토리 뷰 연결(클릭 시 해당 task를
// 캘린더 히스토리 뷰에 표시)은 4주차 "캘린더 히스토리 뷰" 작업과 함께 처리한다
// (checklist.md 참고). 그래서 클릭해도 페이지 이동이나 데이터 반영이 없다.
function CalendarSlotCard({ task }) {
  return (
    <div className="calendar-slot-card">
      <p className="calendar-slot-title">
        <span aria-hidden="true">🗓️</span> 캘린더에 추가
      </p>
      <p className="calendar-slot-detail">
        <strong>{formatDday(task.deadline)}</strong> {task.title}
      </p>
      <button type="button" className="calendar-slot-btn">
        캘린더에 추가 →
      </button>
    </div>
  );
}

export default CalendarSlotCard;
