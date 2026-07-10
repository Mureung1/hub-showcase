import { useAppStore } from '../hooks/useAppStore';
import type { Exercise } from '../types';
import { formatRoutineText } from '../utils/routine';
import RoutineRecommendation from '../components/routine/RoutineRecommendation';
import './RoutinePage.css';

export default function RoutinePage() {
  const {
    members,
    selectedMemberId,
    setSelectedMemberId,
    getMemberRoutine,
    data,
    addExercise,
    removeExercise,
    updateExercise,
    applyMacroToRoutine,
    copySession,
    sendGuide,
    updateRoutine,
    draftRoutines,
    resetDraftRoutine,
  } = useAppStore();

  const selectedMember =
    members.find((m) => m.id === selectedMemberId) ?? members[0];
  const exercises = selectedMember
    ? getMemberRoutine(selectedMember.id)
    : [];
  const savedExercises = selectedMember
    ? (data.routines[selectedMember.id] ?? [])
    : [];
  const hasDraft = selectedMember
    ? !!draftRoutines[selectedMember.id]
    : false;
  const sentGuides = selectedMember
    ? data.sentGuides.filter((g) => g.memberId === selectedMember.id)
    : [];

  const handleFieldChange = (
    exerciseId: string,
    field: keyof Exercise,
    raw: string,
  ) => {
    if (!selectedMember) return;
    const value =
      field === 'name'
        ? raw
        : Number(raw) || 0;
    updateExercise(selectedMember.id, exerciseId, field, value);
    if (hasDraft) resetDraftRoutine(selectedMember.id);
  };

  const handleSave = () => {
    if (!selectedMember) return;
    updateRoutine(selectedMember.id, exercises);
    resetDraftRoutine(selectedMember.id);
  };

  if (!selectedMember) return null;

  return (
    <div className="routine-page">
      <div className="page-header">
        <h1>루틴 관리</h1>
        <p>회원별 운동 루틴을 분석하고 편집하여 가이드를 전송해보세요.</p>
      </div>

      <div className="routine-page-toolbar">
        <div className="member-select-wrap">
          <label htmlFor="routine-member">회원</label>
          <select
            id="routine-member"
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

        <div className="toolbar-actions">
          <button
            type="button"
            className="btn-toolbar"
            onClick={() => copySession(selectedMember.id)}
          >
            📋 세션 복사
          </button>
          <button
            type="button"
            className="btn-toolbar macro"
            onClick={() => applyMacroToRoutine(selectedMember.id, '+2.5kg')}
          >
            +2.5kg
          </button>
          <button
            type="button"
            className="btn-toolbar macro"
            onClick={() => applyMacroToRoutine(selectedMember.id, '+1세트')}
          >
            +1세트
          </button>
          <button
            type="button"
            className="btn-toolbar macro"
            onClick={() => applyMacroToRoutine(selectedMember.id, '+2 reps')}
          >
            +2 reps
          </button>
          {hasDraft && (
            <button
              type="button"
              className="btn-toolbar reset"
              onClick={() => resetDraftRoutine(selectedMember.id)}
            >
              초기화
            </button>
          )}
        </div>
      </div>

      <div className="routine-page-layout">
        <section className="exercise-editor">
          <div className="editor-header">
            <h2>{selectedMember.name}의 루틴</h2>
            <button
              type="button"
              className="btn-add-exercise"
              onClick={() => addExercise(selectedMember.id)}
            >
              + 운동 추가
            </button>
          </div>

          {exercises.length === 0 ? (
            <p className="editor-empty">
              등록된 운동이 없습니다. 운동을 추가해주세요.
            </p>
          ) : (
            <div className="exercise-table">
              <div className="exercise-table-head">
                <span>운동명</span>
                <span>중량(kg)</span>
                <span>세트</span>
                <span>횟수</span>
                <span />
              </div>
              {exercises.map((ex) => (
                <div key={ex.id} className="exercise-row">
                  <input
                    type="text"
                    value={ex.name}
                    placeholder="운동명"
                    onChange={(e) =>
                      handleFieldChange(ex.id, 'name', e.target.value)
                    }
                  />
                  <input
                    type="number"
                    value={ex.weight}
                    min={0}
                    step={2.5}
                    onChange={(e) =>
                      handleFieldChange(ex.id, 'weight', e.target.value)
                    }
                  />
                  <input
                    type="number"
                    value={ex.sets}
                    min={1}
                    onChange={(e) =>
                      handleFieldChange(ex.id, 'sets', e.target.value)
                    }
                  />
                  <input
                    type="number"
                    value={ex.reps}
                    min={1}
                    onChange={(e) =>
                      handleFieldChange(ex.id, 'reps', e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() =>
                      removeExercise(selectedMember.id, ex.id)
                    }
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="editor-footer">
            <button
              type="button"
              className="btn-save"
              onClick={handleSave}
              disabled={exercises.length === 0}
            >
              루틴 저장
            </button>
            <button
              type="button"
              className="btn-send"
              onClick={() => sendGuide(selectedMember.id)}
              disabled={exercises.length === 0}
            >
              가이드 전송 →
            </button>
          </div>
        </section>

        <aside className="routine-sidebar">
          <RoutineRecommendation />

          <div className="preview-card">
            <h3>가이드 미리보기</h3>
            {exercises.length === 0 ? (
              <p className="preview-empty">루틴이 비어 있습니다.</p>
            ) : (
              <pre className="guide-preview">
                {formatRoutineText(selectedMember.name, exercises)}
              </pre>
            )}
          </div>

          <div className="history-card">
            <h3>전송 이력 ({sentGuides.length})</h3>
            {sentGuides.length === 0 ? (
              <p className="history-empty">전송 이력이 없습니다.</p>
            ) : (
              <ul>
                {sentGuides.slice(0, 5).map((guide) => (
                  <li key={guide.id}>
                    <time>
                      {new Date(guide.sentAt).toLocaleString('ko-KR')}
                    </time>
                    <p>
                      {guide.exercises.length}개 운동 ·{' '}
                      {guide.exercises.map((e) => e.name).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {savedExercises.length > 0 && hasDraft && (
            <div className="diff-card">
              <h3>변경 사항</h3>
              <ul>
                {exercises.map((ex, i) => {
                  const saved = savedExercises[i];
                  if (!saved) return null;
                  const changed =
                    ex.weight !== saved.weight ||
                    ex.sets !== saved.sets ||
                    ex.reps !== saved.reps;
                  if (!changed) return null;
                  return (
                    <li key={ex.id}>
                      <strong>{ex.name}</strong>
                      <span>
                        {saved.weight}kg→{ex.weight}kg · {saved.sets}→{ex.sets}
                        세트 · {saved.reps}→{ex.reps}회
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
