import type { ParticipantAgentSynthesis } from "../types/context";

function ParticipantAgentPanel({ synthesis }: { synthesis: ParticipantAgentSynthesis }) {
  return <section className="result-panel participant-agent-panel" aria-labelledby="participant-agent-title"><div className="panel-heading compact agent-heading"><div><p className="section-kicker">Evidence-based perspectives</p><h2 id="participant-agent-title">참여자 프로젝트 관점</h2></div><p className="agent-privacy-note">{synthesis.privacyNote}</p></div><div className="agent-synthesis-grid"><Synthesis title="관점 충돌 · 먼저 확인" empty="명확하게 확인된 관점 충돌이 없습니다." items={synthesis.tensionPoints} tone="tension" /><Synthesis title="공통 합의" empty="명확하게 확인된 공통 합의가 없습니다." items={synthesis.agreementPoints} tone="agreement" /></div>{synthesis.views.length > 0 ? <div className="agent-view-grid">{synthesis.views.map((view, index) => <article className="agent-view-card" key={`${view.actor}-${index}`}><header><div><strong>{view.actor}</strong><span>{view.role}</span></div><span className="evidence-count">근거 {view.evidence.length}</span></header><dl className="agent-view-details"><div><dt>핵심 우선순위</dt><dd>{view.priority}</dd></div><div><dt>관점 해석</dt><dd>{view.interpretation}</dd></div><div><dt>확인할 위험</dt><dd>{view.risk}</dd></div></dl><div className="agent-evidence"><strong>입력 기록 근거</strong>{view.evidence.length > 0 ? <ul>{view.evidence.map((item, evidenceIndex) => <li key={`${item}-${evidenceIndex}`}>{item}</li>)}</ul> : <p>확인 가능한 근거 문장이 없습니다.</p>}</div></article>)}</div> : <p className="agent-empty-state">입력 기록에서 구분할 수 있는 참여자 관점이 없습니다.</p>}</section>;
}

function Synthesis({ title, empty, items, tone }: { title: string; empty: string; items: string[]; tone: "agreement" | "tension" }) {
  return <section className={`agent-synthesis ${tone}`}><h3>{title}</h3>{items.length > 0 ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>{empty}</p>}</section>;
}

export default ParticipantAgentPanel;
