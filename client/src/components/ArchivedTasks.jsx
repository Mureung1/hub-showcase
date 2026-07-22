import { useState } from 'react';
import './ArchivedTasks.css';
import ArchivedTaskItem from './ArchivedTaskItem';
import { memberName } from '../utils/members';
import { canMemberChange } from '../utils/permission';

function ArchivedTasks({
  archivedTasks,
  members,
  currentMemberId,
  pendingTaskIds,
  onRestore,
  showToast,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="archived-tasks">
      <button
        type="button"
        className="archived-toggle-btn"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? '삭제된 항목 숨기기' : '삭제된 항목 보기'}
      </button>

      {isOpen && (
        <div className="archived-list">
          {archivedTasks.length === 0 ? (
            <div className="archived-empty">삭제된 항목이 없어요.</div>
          ) : (
            archivedTasks.map((task) => {
              const canChange = canMemberChange(task, currentMemberId);

              return (
                <ArchivedTaskItem
                  key={task.id}
                  task={task}
                  assigneeName={memberName(members, task.assignee_id)}
                  canChange={canChange}
                  isPending={pendingTaskIds.has(task.id)}
                  onRestore={onRestore}
                  showToast={showToast}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default ArchivedTasks;
