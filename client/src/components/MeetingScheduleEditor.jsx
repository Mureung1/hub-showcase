import { useState } from "react";
import { updateMeeting } from "../api/meetings";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDateTimeLocalValue(isoString) {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function MeetingScheduleEditor({ meeting, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocalValue(meeting?.scheduledAt));
  const [place, setPlace] = useState(meeting?.place ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!meeting) return null;

  const handleEditStart = () => {
    setScheduledAt(toDateTimeLocalValue(meeting.scheduledAt));
    setPlace(meeting.place ?? "");
    setErrorMessage("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setErrorMessage("");
    setIsEditing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const payload = {};
    if (scheduledAt) payload.scheduledAt = new Date(scheduledAt).toISOString();
    if (place.trim()) payload.place = place.trim();

    if (Object.keys(payload).length === 0) {
      setErrorMessage("면담 시간 또는 장소 중 하나 이상을 입력해 주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await updateMeeting(meeting.id, payload);
      onUpdated(response.data);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="meeting-schedule-view">
        <dl className="meeting-schedule-summary">
          <div>
            <dt>면담 시간</dt>
            <dd>
              {meeting.scheduledAt
                ? dateTimeFormatter.format(new Date(meeting.scheduledAt))
                : "아직 정해지지 않았습니다."}
            </dd>
          </div>
          <div>
            <dt>장소</dt>
            <dd>{meeting.place || "아직 정해지지 않았습니다."}</dd>
          </div>
        </dl>
        <button
          className="button button-soft meeting-edit-button"
          onClick={handleEditStart}
          type="button"
        >
          면담 정보 수정
        </button>
      </div>
    );
  }

  return (
    <form className="meeting-schedule-form" onSubmit={handleSave}>
      <label>
        <span>면담 시간</span>
        <input
          className="field"
          onChange={(event) => setScheduledAt(event.target.value)}
          type="datetime-local"
          value={scheduledAt}
        />
      </label>
      <label>
        <span>장소</span>
        <input
          className="field"
          onChange={(event) => setPlace(event.target.value)}
          placeholder="예: 온라인 또는 교내 라운지"
          type="text"
          value={place}
        />
      </label>

      {errorMessage && (
        <p className="meeting-schedule-error" role="alert">{errorMessage}</p>
      )}

      <div className="meeting-schedule-actions">
        <button
          className="button button-neutral"
          disabled={isSaving}
          onClick={handleCancel}
          type="button"
        >
          취소
        </button>
        <button className="button button-primary" disabled={isSaving} type="submit">
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}

export default MeetingScheduleEditor;
