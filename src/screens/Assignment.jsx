import { useEffect, useRef, useState } from 'react';
import { useProject } from '../store';
import { getRolesForType } from '../data/templates';
import { assignRoles, computeTeamStats } from '../logic/assignRoles';
import { explainAssignment } from '../services/mockAi';
import './Assignment.css';

export default function Assignment() {
  const { state, dispatch } = useProject();
  const { project, surveys, plan, assignment, swapUsed } = state;
  const members = project.members;
  const roles = getRolesForType(project.type);
  const roleById = Object.fromEntries(roles.map((r) => [r.id, r]));
  const requested = useRef(false);
  const [swapMode, setSwapMode] = useState(false);
  const [swapPick, setSwapPick] = useState([]);

  useEffect(() => {
    if (assignment || requested.current) return;
    requested.current = true;
    const result = assignRoles(members, surveys, roles);
    // 결정성 확인: 같은 입력으로 한 번 더 계산해 결과가 같은지 콘솔에 기록
    const rerun = assignRoles(members, surveys, roles);
    console.log(
      '[팀플이지] 배정 결정성 확인:',
      JSON.stringify(result.byMember) === JSON.stringify(rerun.byMember) ? '두 번 계산 결과 동일 ✓' : '불일치 ✗',
    );
    const stats = computeTeamStats(members, surveys, roles, result);
    explainAssignment(result, stats).then((explanation) => {
      dispatch({ type: 'SET_ASSIGNMENT', assignment: { result, explanation } });
    });
  }, [assignment, members, surveys, roles, dispatch]);

  if (!assignment) {
    return (
      <section className="plan-loading" aria-live="polite">
        <div className="spinner" />
        <p className="plan-loading-title">🤖 역할을 배정하고 있어요…</p>
        <p className="plan-loading-sub">팀 전체 설문을 종합해 이유를 정리하는 중이에요</p>
      </section>
    );
  }

  const { result, explanation } = assignment;

  const taskCountFor = (memberRoles) =>
    plan ? plan.tasks.filter((t) => t.roleId && memberRoles.includes(t.roleId)).length : 0;

  const handlePick = (memberId) => {
    if (swapPick.includes(memberId)) {
      setSwapPick(swapPick.filter((id) => id !== memberId));
      return;
    }
    const next = [...swapPick, memberId];
    if (next.length < 2) {
      setSwapPick(next);
      return;
    }
    const [a, b] = next;
    const nameA = members.find((m) => m.id === a).name;
    const nameB = members.find((m) => m.id === b).name;
    if (window.confirm(`${nameA} ↔ ${nameB}의 역할을 서로 바꿉니다.\n두 사람 모두 동의했나요? (스왑은 1회만 가능해요)`)) {
      dispatch({ type: 'SWAP_ROLES', a, b });
      setSwapMode(false);
    }
    setSwapPick([]);
  };

  return (
    <section className="assignment">
      <div className="ai-note">
        <span className="ai-note-icon">🤖</span>
        <div>
          <p className="ai-note-text">{explanation.summary}</p>
          <ul className="ai-points">
            {explanation.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      </div>

      {explanation.compromise && (
        <div className="compromise-card">
          <p className="compromise-title">💡 타협안 제안</p>
          <p className="compromise-text">{explanation.compromise}</p>
        </div>
      )}

      {swapMode && (
        <p className="swap-guide">
          서로 역할을 바꿀 <strong>두 팀원</strong>을 선택하세요 ({swapPick.length}/2)
        </p>
      )}

      <ul className="member-cards">
        {members.map((m) => {
          const memberRoles = result.byMember[m.id] ?? [];
          const taskCount = taskCountFor(memberRoles);
          return (
            <li key={m.id}>
              <button
                type="button"
                className={`member-card${swapMode ? ' pickable' : ''}${swapPick.includes(m.id) ? ' picked' : ''}`}
                disabled={!swapMode}
                onClick={() => handlePick(m.id)}
              >
                <span className="member-card-name">{m.name}</span>
                <span className="member-card-roles">
                  {memberRoles.map((rid) => (
                    <span key={rid} className="role-badge">
                      {roleById[rid]?.emoji} {roleById[rid]?.name}
                    </span>
                  ))}
                </span>
                {taskCount > 0 && <span className="member-card-tasks">관련 태스크 {taskCount}개</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="assign-actions">
        {swapMode ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setSwapMode(false);
              setSwapPick([]);
            }}
          >
            스왑 취소
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost"
            disabled={swapUsed}
            onClick={() => setSwapMode(true)}
          >
            {swapUsed ? '🔒 스왑 1회 사용됨' : '🔄 역할 스왑 요청'}
          </button>
        )}
        <button type="button" className="btn-primary" onClick={() => dispatch({ type: 'CONFIRM_ASSIGNMENT' })}>
          확정하고 대시보드로
        </button>
      </div>
      <p className="swap-note">배정 발표 후 48시간 내 1회, 양측 동의 시에만 스왑할 수 있어요.</p>
    </section>
  );
}
