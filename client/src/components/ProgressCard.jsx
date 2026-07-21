import './ProgressCard.css';
import { calcStats } from '../utils/tasks';

function ProgressBlock({ label, variant, percent, caption }) {
  return (
    <div className="progress-block">
      <div className="progress-top">
        <span className="progress-title">
          <span className={`dot dot-${variant}`}></span>
          {label}
        </span>
        <span className="progress-value">{percent}%</span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill fill-${variant}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-caption">{caption}</div>
    </div>
  );
}

function ProgressCard({ tasks, currentMemberId }) {
  const teamStats = calcStats(tasks);
  const myTasks = tasks.filter((t) => t.assignee_id === currentMemberId);
  const myStats = calcStats(myTasks);

  const teamCaption = `총 ${teamStats.total}개 중 ${teamStats.doneCount}개 완료`;
  const myCaption =
    myStats.total === 0
      ? '내 할 일이 아직 없어요'
      : `총 ${myStats.total}개 중 ${myStats.doneCount}개 완료`;

  return (
    <div className="progress-card">
      <ProgressBlock
        label="팀 전체 진행도"
        variant="team"
        percent={teamStats.percent}
        caption={teamCaption}
      />
      <ProgressBlock
        label="내 진행도"
        variant="mine"
        percent={myStats.percent}
        caption={myCaption}
      />
    </div>
  );
}

export default ProgressCard;
