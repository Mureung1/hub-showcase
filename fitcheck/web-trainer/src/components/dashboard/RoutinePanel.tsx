import { useAppStore } from '../../hooks/useAppStore';
import './RoutinePanel.css';

export default function RoutinePanel() {
  const {
    members,
    selectedMemberId,
    setSelectedMemberId,
    getMemberRoutine,
    copySession,
    applyMacroToRoutine,
    sendGuide,
    draftRoutines,
  } = useAppStore();

  const selectedMember =
    members.find((m) => m.id === selectedMemberId) ?? members[0];
  const exercises = selectedMember
    ? getMemberRoutine(selectedMember.id)
    : [];
  const hasDraft = selectedMember
    ? !!draftRoutines[selectedMember.id]
    : false;

  if (!selectedMember) return null;

  return (
    <section className="panel routine-panel">
      <div className="panel-header">
        <div>
          <h2>⚡ 초간편 루틴 입력</h2>
          <p>지난 세션 복사 &amp; 점진적 과부하로 초고속 가이드 전송</p>
        </div>
        {hasDraft && <span className="draft-badge">매크로 적용됨</span>}
      </div>

      <div className="routine-member-select">
        <label htmlFor="member-select">회원 선택</label>
        <select
          id="member-select"
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn-copy-session"
        onClick={() => copySession(selectedMember.id)}
      >
        📋 지난 세션 복사
      </button>

      <div className="macro-buttons">
        <span className="macro-label">점진적 과부하 매크로</span>
        <div className="macro-row">
          <button
            type="button"
            className="btn-macro"
            onClick={() => applyMacroToRoutine(selectedMember.id, '+2.5kg')}
          >
            +2.5kg
          </button>
          <button
            type="button"
            className="btn-macro"
            onClick={() => applyMacroToRoutine(selectedMember.id, '+1세트')}
          >
            +1세트
          </button>
          <button
            type="button"
            className="btn-macro"
            onClick={() => applyMacroToRoutine(selectedMember.id, '+2 reps')}
          >
            +2 reps
          </button>
        </div>
      </div>

      <div className="routine-preview">
        <h3>{selectedMember.name} — 루틴 미리보기</h3>
        {exercises.length === 0 ? (
          <p className="preview-empty">등록된 루틴이 없습니다.</p>
        ) : (
          <ul>
            {exercises.map((item) => (
              <li key={item.id}>
                <span className="exercise-name">{item.name}</span>
                <span className="exercise-detail">
                  {item.weight}kg · {item.sets}세트 × {item.reps}회
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="btn-send-guide"
        onClick={() => sendGuide(selectedMember.id)}
        disabled={exercises.length === 0}
      >
        가이드 전송 →
      </button>
    </section>
  );
}
