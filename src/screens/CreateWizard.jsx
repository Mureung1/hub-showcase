import { useState } from 'react';
import { useProject } from '../store';
import { PROJECT_TYPES, getRolesForType } from '../data/templates';
import './CreateWizard.css';

const MIN_MEMBERS = 3;
const MAX_MEMBERS = 8;

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 28); // 데모 시나리오 기본값: 마감 4주 뒤
  return toDateInputValue(d);
}

export default function CreateWizard() {
  const { dispatch } = useProject();
  const [wizardStep, setWizardStep] = useState(0);
  const [type, setType] = useState(null);
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [names, setNames] = useState(Array(5).fill(''));

  const today = toDateInputValue(new Date());

  const canNext =
    wizardStep === 0 ? type !== null :
    wizardStep === 1 ? goal.trim().length > 0 && deadline >= today :
    true;

  const setMemberCount = (count) => {
    const next = Math.min(MAX_MEMBERS, Math.max(MIN_MEMBERS, count));
    setNames((prev) =>
      prev.length < next
        ? [...prev, ...Array(next - prev.length).fill('')]
        : prev.slice(0, next),
    );
  };

  const setName = (index, value) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const handleCreate = () => {
    const members = names.map((n, i) => ({
      id: `m${i + 1}`,
      name: n.trim() || `팀원${i + 1}`,
    }));
    dispatch({
      type: 'CREATE_PROJECT',
      project: { type, goal: goal.trim(), deadline, members },
    });
  };

  return (
    <section className="wizard">
      <div className="wizard-progress" aria-label={`3단계 중 ${wizardStep + 1}단계`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`wizard-dot${i === wizardStep ? ' active' : ''}${i < wizardStep ? ' done' : ''}`} />
        ))}
      </div>

      {wizardStep === 0 && (
        <>
          <h2 className="wizard-heading">어떤 과제인가요?</h2>
          <p className="wizard-sub">유형에 맞는 계획과 역할을 준비해 드려요</p>
          <div className="type-cards">
            {PROJECT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`type-card${type === t.id ? ' selected' : ''}`}
                onClick={() => setType(t.id)}
              >
                <span className="type-emoji">{t.emoji}</span>
                <span className="type-label">{t.label}</span>
                <span className="type-desc">{t.description}</span>
                <span className="type-roles">
                  {getRolesForType(t.id).map((r) => r.name).join(' · ')}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {wizardStep === 1 && (
        <>
          <h2 className="wizard-heading">목표와 마감일을 알려주세요</h2>
          <p className="wizard-sub">AI가 마감일까지의 계획을 짜는 데 사용해요</p>
          <label className="field">
            <span className="field-label">목표 한 문장</span>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="예: 소비 트렌드 분석 발표에서 A+ 받기"
              maxLength={80}
            />
          </label>
          <label className="field">
            <span className="field-label">마감일</span>
            <input
              type="date"
              value={deadline}
              min={today}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
        </>
      )}

      {wizardStep === 2 && (
        <>
          <h2 className="wizard-heading">팀원은 몇 명인가요?</h2>
          <p className="wizard-sub">닉네임만 적으면 돼요 — 가입은 필요 없어요</p>
          <div className="member-count">
            <button type="button" onClick={() => setMemberCount(names.length - 1)} disabled={names.length <= MIN_MEMBERS}>−</button>
            <span className="member-count-value">{names.length}명</span>
            <button type="button" onClick={() => setMemberCount(names.length + 1)} disabled={names.length >= MAX_MEMBERS}>＋</button>
          </div>
          <div className="member-names">
            {names.map((n, i) => (
              <input
                key={i}
                type="text"
                value={n}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={i === 0 ? '팀원1 (나)' : `팀원${i + 1}`}
                maxLength={12}
              />
            ))}
          </div>
        </>
      )}

      <div className="wizard-nav">
        {wizardStep > 0 && (
          <button type="button" className="btn-ghost" onClick={() => setWizardStep(wizardStep - 1)}>
            이전
          </button>
        )}
        {wizardStep < 2 ? (
          <button type="button" className="btn-primary" disabled={!canNext} onClick={() => setWizardStep(wizardStep + 1)}>
            다음
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={handleCreate}>
            프로젝트 만들기
          </button>
        )}
      </div>
    </section>
  );
}
