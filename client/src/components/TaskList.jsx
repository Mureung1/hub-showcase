import './TaskList.css';
import TaskItem from './TaskItem';
import { memberName } from '../utils/members';

function TaskList({ tasks, members }) {
  if (tasks.length === 0) {
    return <div className="task-empty">아직 할 일이 없어요. 추가해보세요!</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          assigneeName={memberName(members, task.assignee_id)}
        />
      ))}
    </div>
  );
}

export default TaskList;
