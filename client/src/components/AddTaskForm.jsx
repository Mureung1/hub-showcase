import { useState } from 'react';
import './AddTaskForm.css';
import { createTask } from '../api/tasks';
import { getTodayDateString } from '../utils/date';

function AddTaskForm({ members, onTaskAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setTitle('');
    setAssigneeId('');
    setDueDate('');
    setError('');
  }

  function closeForm() {
    setIsOpen(false);
    resetForm();
  }

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('제목은 필수입니다.');
      return;
    }
    if (dueDate && dueDate < getTodayDateString()) {
      setError('마감일은 오늘 이후여야 합니다.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const newTask = await createTask({
        title: trimmedTitle,
        assigneeId: assigneeId ? Number(assigneeId) : null,
        dueDate: dueDate || null,
      });
      onTaskAdded(newTask);
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || '추가하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button type="button" className="add-task-btn" onClick={() => setIsOpen(true)}>
        + 할 일 추가
      </button>
    );
  }

  return (
    <div className="add-task-form">
      <div className="field">
        <label className="field-label" htmlFor="newTaskTitle">할 일 제목</label>
        <input
          id="newTaskTitle"
          type="text"
          className="form-input"
          placeholder="예: 디자인 리뷰"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="form-row">
        <div className="field">
          <label className="field-label" htmlFor="newTaskAssignee">담당자</label>
          <select
            id="newTaskAssignee"
            className="form-input"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">담당자 없음</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="newTaskDue">마감기한</label>
          <input
            id="newTaskDue"
            type="date"
            className="form-input"
            min={getTodayDateString()}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={closeForm}>
          취소
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          추가
        </button>
      </div>
    </div>
  );
}

export default AddTaskForm;
