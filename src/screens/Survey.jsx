import { useState } from 'react';
import { useProject } from '../store';
import { getRolesForType } from '../data/templates';
import './Survey.css';

/* 데모용 랜덤 응답 생성 — "남은 팀원 랜덤 채우기" 버튼에서 사용 */
function randomSurvey(roles) {
  const shuffled = [...roles].sort(() => Math.random() - 0.5);
  const prefCount = 1 + Math.floor(Math.random() * 3);
  const preferences = shuffled.slice(0, prefCount).map((r) => r.id);
  const rest = shuffled.slice(prefCount);
  const avoid = rest.length > 0 && Math.random() < 0.5 ? rest[0].id : null;
  const experience = roles.filter(() => Math.random() < 0.35).map((r) => r.id);
  const leader = ['yes', 'no', 'any'][Math.floor(Math.random() * 3)];
  return { preferences, avoid, experience, leader };
}

const LEADER_OPTIONS = [
  { value: 'yes', label: '예' },
  { value: 'no', label: '아니오' },
  { value: 'any', label: '상관없음' },
];

function SurveyForm({ roles, initial, isResubmit, onSubmit }) {
  const [prefs, setPrefs] = useState(initial?.preferences ?? []);
  const [avoid, setAvoid] = useState(initial?.avoid ?? null);
  const [exp, setExp] = useState(initial?.experience ?? []);
  const [leader, setLeader] = useState(initial?.leader ?? 'any');

  const togglePref = (roleId) => {
    if (prefs.includes(roleId)) {
      setPrefs(prefs.filter((id) => id !== roleId));
      return;
    }
    if (prefs.length >= 3) return;
    setPrefs([...prefs, roleId]);
    if (avoid === roleId) setAvoid(null); // 선호와 기피는 동시 선택 불가
  };

  const toggleAvoid = (roleId) => {
    if (avoid === roleId) {
      setAvoid(null);
      return;
    }
    setAvoid(roleId);
    setPrefs(prefs.filter((id) => id !== roleId));
  };

  const toggleExp = (roleId) => {
    setExp(exp.includes(roleId) ? exp.filter((id) => id !== roleId) : [...exp, roleId]);
  };

  return (
    <div className="survey-form">
      <div className="survey-section">
        <h3 className="survey-q">선호하는 역할을 순서대로 골라주세요</h3>
        <p className="survey-hint">누르는 순서대로 1~3순위가 돼요 (최소 1개)</p>
        <div className="role-grid">
          {roles.map((role) => {
            const rank = prefs.indexOf(role.id);
            return (
              <button
                key={role.id}
                type="button"
                className={`role-card${rank >= 0 ? ' picked' : ''}`}
                onClick={() => togglePref(role.id)}
              >
                {rank >= 0 && <span className="rank-badge">{rank + 1}순위</span>}
                <span className="role-card-emoji">{role.emoji}</span>
                <span className="role-card-name">{role.name}</span>
                <span className="role-card-desc">{role.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="survey-section">
        <h3 className="survey-q">꼭 피하고 싶은 역할이 있나요?</h3>
        <p className="survey-hint">최대 1개, 없어도 괜찮아요 (절대 배정되지 않아요)</p>
        <div className="chip-row">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`select-chip avoid${avoid === role.id ? ' on' : ''}`}
              onClick={() => toggleAvoid(role.id)}
            >
              {role.emoji} {role.name}
            </button>
          ))}
        </div>
      </div>

      <div className="survey-section">
        <h3 className="survey-q">해본 적 있는 역할이 있나요?</h3>
        <p className="survey-hint">경험이 있으면 배정에 조금 더 반영돼요</p>
        <div className="chip-row">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`select-chip${exp.includes(role.id) ? ' on' : ''}`}
              onClick={() => toggleExp(role.id)}
            >
              {exp.includes(role.id) ? '✓ ' : ''}{role.emoji} {role.name}
            </button>
          ))}
        </div>
      </div>

      <div className="survey-section">
        <h3 className="survey-q">조장(리더)을 맡을 의향이 있나요?</h3>
        <div className="segmented">
          {LEADER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`segment${leader === opt.value ? ' on' : ''}`}
              onClick={() => setLeader(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn-primary survey-submit"
        disabled={prefs.length === 0}
        onClick={() => onSubmit({ preferences: prefs, avoid, experience: exp, leader })}
      >
        {isResubmit ? '수정해서 다시 제출' : '제출하기'}
      </button>
    </div>
  );
}

export default function Survey() {
  const { state, dispatch } = useProject();
  const { project, surveys } = state;
  const members = project.members;
  const roles = getRolesForType(project.type);

  const [selectedId, setSelectedId] = useState(
    () => members.find((m) => !surveys[m.id])?.id ?? members[0].id,
  );

  const submitted = members.filter((m) => surveys[m.id]);
  const remaining = members.filter((m) => !surveys[m.id]);
  const selected = members.find((m) => m.id === selectedId);

  const handleSubmit = (survey) => {
    dispatch({ type: 'SUBMIT_SURVEY', memberId: selectedId, survey });
    const next = members.find((m) => m.id !== selectedId && !surveys[m.id]);
    if (next) setSelectedId(next.id);
  };

  const fillRemaining = () => {
    const entries = {};
    remaining.forEach((m) => {
      entries[m.id] = randomSurvey(roles);
    });
    dispatch({ type: 'SUBMIT_SURVEYS', entries });
  };

  const closeSurvey = () => {
    if (
      remaining.length > 0 &&
      !window.confirm(`미제출 ${remaining.length}명은 '상관없음'으로 처리됩니다. 설문을 마감하고 배정을 진행할까요?`)
    ) {
      return;
    }
    dispatch({ type: 'CLOSE_SURVEY' });
  };

  return (
    <section className="survey">
      <div className="survey-status">
        <span className="survey-status-count">
          제출 {submitted.length}/{members.length}명
        </span>
        <span className="survey-privacy">🔒 응답은 비공개 — 배정 이유는 팀 단위로만 설명돼요</span>
      </div>

      <div className="member-tabs" role="tablist" aria-label="설문할 팀원 선택">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === selectedId}
            className={`member-tab${m.id === selectedId ? ' active' : ''}${surveys[m.id] ? ' done' : ''}`}
            onClick={() => setSelectedId(m.id)}
          >
            {surveys[m.id] ? '✓ ' : ''}{m.name}
          </button>
        ))}
      </div>

      <p className="survey-current">
        <strong>{selected.name}</strong>의 설문
        {surveys[selectedId] && <span className="resubmit-note"> — 제출 완료, 수정할 수 있어요</span>}
      </p>

      {/* key로 팀원 전환 시 폼 상태를 초기화한다 */}
      <SurveyForm
        key={selectedId}
        roles={roles}
        initial={surveys[selectedId]}
        isResubmit={Boolean(surveys[selectedId])}
        onSubmit={handleSubmit}
      />

      <div className="survey-footer">
        {remaining.length > 0 && (
          <button type="button" className="btn-ghost" onClick={fillRemaining}>
            🎲 남은 팀원 {remaining.length}명 랜덤 채우기 (데모용)
          </button>
        )}
        <button
          type="button"
          className={remaining.length === 0 ? 'btn-primary' : 'btn-ghost'}
          onClick={closeSurvey}
        >
          {remaining.length === 0
            ? '역할 배정 진행'
            : `설문 마감하고 배정 진행 (미제출 ${remaining.length}명)`}
        </button>
      </div>
    </section>
  );
}
