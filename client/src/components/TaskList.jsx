import './TaskList.css';
import TaskItem from './TaskItem';
import { memberName } from '../utils/members';

function TaskList({
  tasks,
  members,
  currentMemberId,
  pendingTaskIds,
  onToggleStatus,
  onCycleStatus,
  onDelete,
}) {
  if (tasks.length === 0) {
    return <div className="task-empty">아직 할 일이 없어요. 추가해보세요!</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => {
        const canChange = task.assignee_id === null || task.assignee_id === currentMemberId;

        return (
          <TaskItem
            key={task.id}
            task={task}
            assigneeName={memberName(members, task.assignee_id)}
            canChange={canChange}
            isPending={pendingTaskIds.has(task.id)}
            onToggleStatus={onToggleStatus}
            onCycleStatus={onCycleStatus}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}

export default TaskList;
