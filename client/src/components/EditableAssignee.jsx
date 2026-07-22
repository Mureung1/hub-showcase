import { useState } from 'react';
import './EditableAssignee.css';

function EditableAssignee({ assigneeId, assigneeName, members, canChange, showToast, onSave }) {
  const [isEditing, setIsEditing] = useState(false);

  function startEdit() {
    if (!canChange) {
      showToast('담당자만 담당자를 지정할 수 있습니다.');
      return;
    }
    setIsEditing(true);
  }

  async function handleChange(e) {
    const value = e.target.value ? Number(e.target.value) : null;
    setIsEditing(false);
    if (value === assigneeId) return;
    await onSave(value);
  }

  if (isEditing) {
    return (
      <select
        className="assignee-select"
        defaultValue={assigneeId ?? ''}
        autoFocus
        onChange={handleChange}
        onBlur={() => setIsEditing(false)}
      >
        <option value="">담당자 없음</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span className="assignee-display" onClick={startEdit}>
      {assigneeName}
    </span>
  );
}

export default EditableAssignee;
