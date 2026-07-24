import { useState, useEffect } from "react";
import { getEvents, updateEvent, deleteEvent } from "../../api/analysisApi";
import "./CalendarPage.css";

function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setError("");
      try {
        const response = await getEvents();
        setEvents(response.data || []);
      } catch (err) {
        setError(err.message);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, []);

  function handleStartEdit() {
    setEditFormData({
      name: selectedEvent.name || "",
      startDate: selectedEvent.startDate || "",
      endDate: selectedEvent.endDate || "",
      deadline: selectedEvent.deadline || "",
      timeStart: selectedEvent.time?.start || "",
      timeEnd: selectedEvent.time?.end || "",
      location: selectedEvent.location || "",
      deliverables: selectedEvent.deliverables || [],
      notes: selectedEvent.notes || "",
    });
    setIsEditing(true);
    setEditError("");
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditFormData(null);
    setEditError("");
  }

  function handleEditInputChange(field, value) {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleDeliverableChange(index, value) {
    const updated = [...editFormData.deliverables];
    updated[index] = value;
    setEditFormData((prev) => ({
      ...prev,
      deliverables: updated,
    }));
  }

  function handleAddDeliverable() {
    setEditFormData((prev) => ({
      ...prev,
      deliverables: [...prev.deliverables, ""],
    }));
  }

  function handleRemoveDeliverable(index) {
    const updated = editFormData.deliverables.filter((_, i) => i !== index);
    setEditFormData((prev) => ({
      ...prev,
      deliverables: updated,
    }));
  }

  async function handleSaveEdit() {
    setEditError("");
    const trimmedName = editFormData.name.trim();

    if (!trimmedName) {
      setEditError("일정명은 필수입니다.");
      return;
    }

    if (!editFormData.startDate && !editFormData.endDate && !editFormData.deadline) {
      setEditError("시작일, 종료일, 마감일 중 최소 하나는 필수입니다.");
      return;
    }

    if (editFormData.startDate && editFormData.endDate && editFormData.endDate < editFormData.startDate) {
      setEditError("종료일은 시작일보다 이전일 수 없습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: trimmedName,
        startDate: editFormData.startDate || undefined,
        endDate: editFormData.endDate || undefined,
        deadline: editFormData.deadline || undefined,
        time: {
          start: editFormData.timeStart || undefined,
          end: editFormData.timeEnd || undefined,
        },
        location: editFormData.location || undefined,
        deliverables: editFormData.deliverables.filter((d) => d.trim()).length > 0
          ? editFormData.deliverables.filter((d) => d.trim())
          : undefined,
        notes: editFormData.notes || undefined,
      };

      const result = await updateEvent(selectedEvent.id, payload);

      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? result.data : e))
      );

      setSelectedEvent(result.data);
      setIsEditing(false);
      setEditFormData(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEvent() {
    if (!window.confirm("정말 이 일정을 삭제하시겠습니까?")) {
      return;
    }

    setIsSubmitting(true);

    try {
      await deleteEvent(selectedEvent.id);
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
      setSelectedEvent(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePrevMonth() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  }

  function handleNextMonth() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  }

  function generateCalendarDays() {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, daysInPrevMonth - i),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return days;
  }

  function isToday(date) {
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  function getEventsForDate(date) {
    const dateStr = date.toISOString().split("T")[0];
    const dayEvents = [];
    const seenKeys = new Set();

    events.forEach((event, idx) => {
      const eventKey = `${idx}`;

      if (event.deadline === dateStr && !seenKeys.has(`${eventKey}-deadline`)) {
        dayEvents.push({ ...event, eventType: "deadline", uniqueKey: `${eventKey}-deadline` });
        seenKeys.add(`${eventKey}-deadline`);
      } else if (event.startDate === dateStr && !seenKeys.has(`${eventKey}-start`)) {
        dayEvents.push({ ...event, eventType: "start", uniqueKey: `${eventKey}-start` });
        seenKeys.add(`${eventKey}-start`);
      } else if (event.endDate === dateStr && event.endDate !== event.startDate && !seenKeys.has(`${eventKey}-end`)) {
        dayEvents.push({ ...event, eventType: "end", uniqueKey: `${eventKey}-end` });
        seenKeys.add(`${eventKey}-end`);
      }
    });

    return dayEvents;
  }

  const monthNames = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월",
  ];

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const calendarDays = generateCalendarDays();

  return (
    <section className="calendar-section">
      <div className="calendar-container">
        <div className="calendar-header">
          <h2>{year}년 {monthNames[month]}</h2>
          <div className="calendar-nav">
            <button type="button" onClick={handlePrevMonth}>
              ◀ 이전
            </button>
            <button type="button" onClick={handleNextMonth}>
              다음 ▶
            </button>
          </div>
        </div>

        {isLoading && <p className="calendar-message">일정을 불러오는 중...</p>}

        {error && <p className="calendar-error">에러: {error}</p>}

        {!isLoading && !error && (
          <>
            <div className="calendar-weekdays">
              {weekDays.map((day) => (
                <div key={day} className="weekday">
                  {day}
                </div>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarDays.map((dayObj, index) => {
                const dayEvents = getEventsForDate(dayObj.date);
                return (
                  <div
                    key={index}
                    className={`calendar-day ${
                      dayObj.isCurrentMonth ? "current" : "other"
                    } ${isToday(dayObj.date) ? "today" : ""}`}
                  >
                    <div className="day-number">{dayObj.day}</div>
                    <div className="day-events">
                      {dayEvents.map((event) => (
                        <button
                          key={event.uniqueKey}
                          className={`event-badge event-${event.eventType}`}
                          onClick={() => setSelectedEvent(event)}
                          type="button"
                        >
                          {event.eventType === "deadline" && "📌"}
                          {event.eventType === "start" && "▶"}
                          {event.eventType === "end" && "■"}
                          {" "}
                          <span className="event-name">{event.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {events.length === 0 && (
              <p className="calendar-message">저장된 일정이 없습니다.</p>
            )}

            {selectedEvent && (
              <div className="event-detail-overlay" onClick={() => !isEditing && setSelectedEvent(null)}>
                <div className="event-detail-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="detail-header">
                    <h3>{isEditing ? "일정 수정" : selectedEvent.name}</h3>
                    <button type="button" className="detail-close" onClick={() => isEditing ? handleCancelEdit() : setSelectedEvent(null)} disabled={isSubmitting}>
                      ✕
                    </button>
                  </div>
                  <div className="detail-content">
                    {editError && <p className="edit-error">{editError}</p>}

                    {!isEditing ? (
                      <>
                        {selectedEvent.startDate && (
                          <div className="detail-item">
                            <span className="detail-label">시작일:</span>
                            <span className="detail-value">{selectedEvent.startDate}</span>
                          </div>
                        )}
                        {selectedEvent.endDate && (
                          <div className="detail-item">
                            <span className="detail-label">종료일:</span>
                            <span className="detail-value">{selectedEvent.endDate}</span>
                          </div>
                        )}
                        {selectedEvent.deadline && (
                          <div className="detail-item">
                            <span className="detail-label">마감일:</span>
                            <span className="detail-value">{selectedEvent.deadline}</span>
                          </div>
                        )}
                        {selectedEvent.time?.start && (
                          <div className="detail-item">
                            <span className="detail-label">시작 시간:</span>
                            <span className="detail-value">{selectedEvent.time.start}</span>
                          </div>
                        )}
                        {selectedEvent.time?.end && (
                          <div className="detail-item">
                            <span className="detail-label">종료 시간:</span>
                            <span className="detail-value">{selectedEvent.time.end}</span>
                          </div>
                        )}
                        {selectedEvent.location && (
                          <div className="detail-item">
                            <span className="detail-label">장소:</span>
                            <span className="detail-value">{selectedEvent.location}</span>
                          </div>
                        )}
                        {selectedEvent.deliverables && selectedEvent.deliverables.length > 0 && (
                          <div className="detail-item">
                            <span className="detail-label">제출물:</span>
                            <span className="detail-value">{selectedEvent.deliverables.join(", ")}</span>
                          </div>
                        )}
                        {selectedEvent.notes && (
                          <div className="detail-item">
                            <span className="detail-label">메모:</span>
                            <span className="detail-value">{selectedEvent.notes}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="form-group">
                          <label>일정명</label>
                          <input type="text" value={editFormData.name} onChange={(e) => handleEditInputChange("name", e.target.value)} disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                          <label>시작일</label>
                          <input type="date" value={editFormData.startDate} onChange={(e) => handleEditInputChange("startDate", e.target.value)} disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                          <label>종료일</label>
                          <input type="date" value={editFormData.endDate} onChange={(e) => handleEditInputChange("endDate", e.target.value)} disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                          <label>마감일</label>
                          <input type="date" value={editFormData.deadline} onChange={(e) => handleEditInputChange("deadline", e.target.value)} disabled={isSubmitting} />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>시작 시간</label>
                            <input type="time" value={editFormData.timeStart} onChange={(e) => handleEditInputChange("timeStart", e.target.value)} disabled={isSubmitting} />
                          </div>
                          <div className="form-group">
                            <label>종료 시간</label>
                            <input type="time" value={editFormData.timeEnd} onChange={(e) => handleEditInputChange("timeEnd", e.target.value)} disabled={isSubmitting} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>장소</label>
                          <input type="text" value={editFormData.location} onChange={(e) => handleEditInputChange("location", e.target.value)} disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                          <label>제출물</label>
                          {editFormData.deliverables.map((item, idx) => (
                            <div key={idx} className="deliverable-input">
                              <input type="text" value={item} onChange={(e) => handleDeliverableChange(idx, e.target.value)} placeholder="제출물" disabled={isSubmitting} />
                              <button type="button" onClick={() => handleRemoveDeliverable(idx)} disabled={isSubmitting} className="btn-remove">✕</button>
                            </div>
                          ))}
                          <button type="button" onClick={handleAddDeliverable} disabled={isSubmitting} className="btn-add">+ 제출물 추가</button>
                        </div>
                        <div className="form-group">
                          <label>메모</label>
                          <textarea value={editFormData.notes} onChange={(e) => handleEditInputChange("notes", e.target.value)} disabled={isSubmitting} />
                        </div>
                      </>
                    )}
                  </div>
                  {!isEditing ? (
                    <div className="detail-actions">
                      <button type="button" onClick={handleStartEdit} disabled={isSubmitting} className="btn-edit">수정</button>
                      <button type="button" onClick={handleDeleteEvent} disabled={isSubmitting} className="btn-delete">일정 삭제</button>
                    </div>
                  ) : (
                    <div className="detail-actions">
                      <button type="button" onClick={handleSaveEdit} disabled={isSubmitting} className="btn-save">저장</button>
                      <button type="button" onClick={handleCancelEdit} disabled={isSubmitting} className="btn-cancel">취소</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default CalendarPage;
