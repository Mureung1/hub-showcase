import './ArchivedTaskItem.css';

function ArchivedTaskItem({ task, assigneeName, canChange, isPending, onRestore, showToast }) {
  function handleRestoreClick() {
    if (!canChange) {
      showToast('담당자만 복원할 수 있습니다.');
      return;
    }
    onRestore(task.id);
  }

  return (
    <div className="archived-item">
      <div className="archived-info">
        <div className="archived-title">{task.title}</div>
        <div className="archived-meta">{assigneeName}</div>
      </div>
      <button
        type="button"
        className="restore-btn"
        onClick={handleRestoreClick}
        disabled={isPending}
      >
        복원
      </button>
    </div>
  );
}

export default ArchivedTaskItem;
