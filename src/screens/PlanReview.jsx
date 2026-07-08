import { useEffect, useRef, useState } from 'react';
import { useProject } from '../store';
import { getRolesForType } from '../data/templates';
import { generatePlan } from '../services/mockAi';
import { formatKorean } from '../utils/dates';
import './PlanReview.css';

export default function PlanReview() {
  const { state, dispatch } = useProject();
  const { project, plan } = state;
  const [regenerating, setRegenerating] = useState(false);
  const [editingId, setEditingId] = useState(null); // 수정 중인 taskId
  const [addingTo, setAddingTo] = useState(null); // 추가 중인 milestoneId
  const [draft, setDraft] = useState('');
  const requested = useRef(false);

  const roles = getRolesForType(project.type);
  const roleById = Object.fromEntries(roles.map((r) => [r.id, r]));

  useEffect(() => {
    if (plan || requested.current) return;
    requested.current = true;
    generatePlan(project).then((p) => dispatch({ type: 'SET_PLAN', plan: p }));
  }, [plan, project, dispatch]);

  const handleRegenerate = async () => {
    if (!window.confirm('현재 계획(수정한 내용 포함)을 버리고 새 제안을 받을까요?')) return;
    setRegenerating(true);
    setEditingId(null);
    setAddingTo(null);
    const p = await generatePlan(project, { variant: plan.variant + 1 });
    dispatch({ type: 'SET_PLAN', plan: p });
    setRegenerating(false);
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setAddingTo(null);
    setDraft(task.title);
  };

  const commitEdit = () => {
    const title = draft.trim();
    if (title) dispatch({ type: 'UPDATE_TASK', taskId: editingId, patch: { title } });
    setEditingId(null);
  };

  const startAdd = (milestoneId) => {
    setAddingTo(milestoneId);
    setEditingId(null);
    setDraft('');
  };

  const commitAdd = () => {
    const title = draft.trim();
    if (title) dispatch({ type: 'ADD_TASK', milestoneId: addingTo, title });
    setAddingTo(null);
  };

  const handleKeys = (commit) => (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setEditingId(null);
      setAddingTo(null);
    }
  };

  if (!plan || regenerating) {
    return (
      <section className="plan-loading" aria-live="polite">
        <div className="spinner" />
        <p className="plan-loading-title">🤖 AI가 계획을 짜고 있어요…</p>
        <p className="plan-loading-sub">마감일과 학사 일정을 확인하는 중이에요</p>
      </section>
    );
  }

  return (
    <section className="plan-review">
      <div className="ai-note">
        <span className="ai-note-icon">🤖</span>
        <div>
          <p className="ai-note-text">{plan.examNote}</p>
          <p className="ai-note-hint">제안일 뿐이에요 — 태스크를 눌러 자유롭게 수정하세요.</p>
        </div>
      </div>

      <ol className="timeline">
        {plan.milestones.map((ms, i) => {
          const msTasks = plan.tasks.filter((t) => t.milestoneId === ms.id);
          return (
            <li key={ms.id} className="milestone">
              <div className="milestone-header">
                <span className="milestone-dot">{i + 1}</span>
                <div>
                  <h3 className="milestone-title">{ms.title}</h3>
                  <span className="milestone-due">~ {formatKorean(ms.dueDate)}</span>
                </div>
              </div>

              <ul className="task-list">
                {msTasks.map((task) => {
                  const role = task.roleId ? roleById[task.roleId] : null;
                  return (
                    <li key={task.id} className="task-row">
                      {editingId === task.id ? (
                        <input
                          className="task-input"
                          value={draft}
                          autoFocus
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleKeys(commitEdit)}
                          maxLength={40}
                        />
                      ) : (
                        <>
                          <button type="button" className="task-body" onClick={() => startEdit(task)}>
                            <span className="task-title">{task.title}</span>
                            {role && (
                              <span className="role-badge">
                                {role.emoji} {role.name}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            className="task-delete"
                            aria-label={`${task.title} 삭제`}
                            onClick={() => dispatch({ type: 'DELETE_TASK', taskId: task.id })}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}

                <li className="task-row">
                  {addingTo === ms.id ? (
                    <input
                      className="task-input"
                      value={draft}
                      autoFocus
                      placeholder="새 태스크 이름"
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commitAdd}
                      onKeyDown={handleKeys(commitAdd)}
                      maxLength={40}
                    />
                  ) : (
                    <button type="button" className="task-add" onClick={() => startAdd(ms.id)}>
                      ＋ 태스크 추가
                    </button>
                  )}
                </li>
              </ul>
            </li>
          );
        })}
      </ol>

      <div className="plan-actions">
        <button type="button" className="btn-ghost" onClick={handleRegenerate}>
          🔄 다시 제안받기
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => dispatch({ type: 'CONFIRM_PLAN' })}
        >
          이대로 확정
        </button>
      </div>
    </section>
  );
}
