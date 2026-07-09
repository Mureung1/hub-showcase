import { useApp } from '../context/AppContext';
import { tipDefs } from '../data/tips';

export default function Cooking() {
  const { back, recipeDetail, cookSteps, cookIdx, cookStep, openTip } = useApp();
  if (!recipeDetail || !cookSteps.length) return null;
  const s = cookSteps[cookIdx];
  const isLast = cookIdx === cookSteps.length - 1;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>{recipeDetail.name} — 조리모드</h1></div>
      <div className="content">
        <div className="progress"><i style={{ width: `${((cookIdx + 1) / cookSteps.length) * 100}%` }} /></div>
        <div className="step-label">STEP {cookIdx + 1} / {cookSteps.length}</div>
        <div className="step-box">
          <div className="s-emoji">{s.emoji}</div>
          <div className="s-text" dangerouslySetInnerHTML={{ __html: s.text }} />
          {s.tip && <div className="s-tip">{s.tip}</div>}
          <div className="tip-links">
            {(s.tips || []).map((k) => (
              <span key={k} className="tip-link" onClick={() => openTip(k)}>📖 {tipDefs[k].title}</span>
            ))}
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--sub)', marginTop: 10 }}>📖 밑줄 팁을 누르면 왕초보 설명이 나와요</p>
      </div>
      <div className="bottom-fixed">
        <div className="btn-row">
          <button className="btn gray" style={{ visibility: cookIdx === 0 ? 'hidden' : 'visible' }} onClick={() => cookStep(-1)}>‹ 이전</button>
          <button className="btn primary" onClick={() => cookStep(1)}>{isLast ? '🍽️ 식사 완료' : '다음 ›'}</button>
        </div>
      </div>
    </section>
  );
}
