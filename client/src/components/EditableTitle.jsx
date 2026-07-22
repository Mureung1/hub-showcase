import { useState } from 'react';
import './EditableTitle.css';

function EditableTitle({ title, canChange, showToast, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);

  function startEdit() {
    if (!canChange) {
      showToast('담당자만 제목을 수정할 수 있습니다.');
      return;
    }
    setValue(title);
    setIsEditing(true);
  }

  async function commit() {
    const trimmed = value.trim();

    if (!trimmed) {
      showToast('제목은 비울 수 없습니다.');
      setValue(title);
      setIsEditing(false);
      return;
    }

    if (trimmed === title) {
      setIsEditing(false);
      return;
    }

    await onSave(trimmed);
    setIsEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setValue(title);
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <input
        type="text"
        className="task-title-input"
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div className="task-title task-title-display" onClick={startEdit}>
      {title}
    </div>
  );
}

export default EditableTitle;
