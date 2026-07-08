import { useState } from 'react';
import { useProject } from '../store';
import { getRolesForType } from '../data/templates';
import { parseDate, diffDays, formatKorean } from '../utils/dates';
import './Dashboard.css';

const STATUSES = [
  { id: 'todo', label: '할 일' },
  { id: 'doing', label: '진행 중' },
  { id: 'done', label: '완료' },
];

function ProgressBar({ percent }) {
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function Dashboard() {
  const { state, dispatch } = useProject();
  const { project, plan, assignment } = state;
  const members = project.members;
  const roles = getRolesForType(project.type);
  const roleById = Object.fromEntries(roles.map((r) => [r.id, r]));

  // 단일 브라우저 시뮬레이션: "내 태스크 강조"의 기준이 될 팀원을 고른다
  const [viewerId, setViewerId] = useState(members[0].id);
  const myRoles = assignment?.result.byMember[viewerId] ?? [];

  const tasks = plan?.tasks ?? [];
  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const dday = diffDays(new Date(), parseDate(project.deadline));

  const move = (task, dir) => {
    const idx = STATUSES.findIndex((s) => s.id === task.status);
    const next = STATUSES[idx + dir];
    if (next) dispatch({ type: 'UPDATE_TASK', taskId: task.id, patch: { status: next.id } });
  };

  return (
    <section className="dashboard">
      {/* 전체 진행률 + D-day */}
      <div className="dash-summary">
        <div className="dash-summary-top">
          <span className="dash-goal">{project.goal}</span>
          <span className={`dday-chip${dday < 7 ? ' urgent' : ''}`}>
            {dday >= 0 ? `D-${dday}` : `D+${-dday}`}
          </span>
        </div>
        <ProgressBar percent={percent} />
        <span className="dash-percent">
          전체 진행률 {percent}% · 완료 {doneCount}/{total} · 마감 {formatKorean(project.deadline)}
        </span>
      </div>

      {/* 보는 사람 선택 → 내 태스크 강조 */}
      <div className="viewer">
        <div className="member-tabs" role="tablist" aria-label="내 태스크 기준 팀원 선택">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === viewerId}
              className={`member-tab${m.id === viewerId ? ' active' : ''}`}
              onClick={() => setViewerId(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
        <p className="viewer-roles">
          내 역할:{' '}
          {myRoles.length > 0
            ? myRoles.map((rid) => (
                <span key={rid} className="role-badge">
                  {roleById[rid]?.emoji} {roleById[rid]?.name}
                </span>
              ))
            : '없음'}
        </p>
      </div>

      {/* 3열 고정 칸반 */}
      <div className="kanban">
        {STATUSES.map((st, si) => {
          const colTasks = tasks.filter((t) => t.status === st.id);
          return (
            <div key={st.id} className="kanban-col">
              <h3 className="kanban-head">
                {st.label} <span className="kanban-count">{colTasks.length}</span>
              </h3>
              <ul className="kanban-list">
                {colTasks.map((task) => {
                  const mine = task.roleId !== null && myRoles.includes(task.roleId);
                  const role = task.roleId ? roleById[task.roleId] : null;
                  return (
                    <li key={task.id} className={`kanban-card${mine ? ' mine' : ''}${st.id === 'done' ? ' finished' : ''}`}>
                      {mine && <span className="mine-tag">내 태스크</span>}
                      <span className="kanban-card-title">
                        {role && `${role.emoji} `}
                        {task.title}
                      </span>
                      <div className="kanban-move">
                        <button
                          type="button"
                          disabled={si === 0}
                          aria-label={`${task.title} 이전 단계로`}
                          onClick={() => move(task, -1)}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          disabled={si === STATUSES.length - 1}
                          aria-label={`${task.title} 다음 단계로`}
                          onClick={() => move(task, 1)}
                        >
                          ›
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* 마일스톤별 진행률 */}
      <div className="ms-progress-section">
        <h3 className="ms-progress-heading">마일스톤별 진행률</h3>
        <ul className="ms-progress-list">
          {(plan?.milestones ?? []).map((ms) => {
            const msTasks = tasks.filter((t) => t.milestoneId === ms.id);
            const msDone = msTasks.filter((t) => t.status === 'done').length;
            const msPercent = msTasks.length > 0 ? Math.round((msDone / msTasks.length) * 100) : 0;
            return (
              <li key={ms.id} className="ms-progress-row">
                <div className="ms-progress-info">
                  <span className="ms-progress-title">{ms.title}</span>
                  <span className="ms-progress-meta">
                    ~ {formatKorean(ms.dueDate)} · {msDone}/{msTasks.length}
                  </span>
                </div>
                <ProgressBar percent={msPercent} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
