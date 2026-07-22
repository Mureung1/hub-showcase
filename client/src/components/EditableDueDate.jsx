import { useState } from 'react';
import './EditableDueDate.css';
import { formatDue, getTodayDateString } from '../utils/date';

function EditableDueDate({ dueDate, canChange, showToast, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(dueDate || '');

  function startEdit() {
    if (!canChange) {
      showToast('담당자만 마감일을 수정할 수 있습니다.');
      return;
    }
    setValue(dueDate || '');
    setIsEditing(true);
  }

  async function handleChange(e) {
    const raw = e.target.value;
    setValue(raw);
    const newValue = raw || null;

    if (newValue && newValue < getTodayDateString()) {
      showToast('마감일은 오늘 이후여야 합니다.');
      return;
    }

    setIsEditing(false);
    if (newValue === (dueDate || null)) return;
    await onSave(newValue);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') setIsEditing(false);
  }

  if (isEditing) {
    return (
      <input
        type="date"
        className="due-date-input"
        value={value}
        min={getTodayDateString()}
        autoFocus
        onChange={handleChange}
        onBlur={() => setIsEditing(false)}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <span className="due-date-display" onClick={startEdit}>
      {dueDate ? `마감 ${formatDue(dueDate)}` : formatDue(dueDate)}
    </span>
  );
}

export default EditableDueDate;
