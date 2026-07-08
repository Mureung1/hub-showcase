import { useProject, STEPS } from '../store';
import { getTypeById } from '../data/templates';

/* 아직 구현되지 않은 단계의 자리표시자 — 위저드에서 저장된 프로젝트 정보를 보여준다 */
export default function Placeholder({ stage }) {
  const { state } = useProject();
  const { project } = state;
  const type = project ? getTypeById(project.type) : null;
  const stepLabel = STEPS.find((s) => s.id === state.step)?.label ?? '';

  const dday = project
    ? Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <section className="placeholder">
      <h2 className="placeholder-title">{stepLabel}</h2>
      <p className="placeholder-note">이 화면은 {stage}단계에서 구현될 예정이에요.</p>

      {project && (
        <div className="summary-card">
          <h3 className="summary-heading">생성된 프로젝트</h3>
          <dl className="summary-list">
            <div>
              <dt>과제 유형</dt>
              <dd>{type ? `${type.emoji} ${type.label}` : project.type}</dd>
            </div>
            <div>
              <dt>목표</dt>
              <dd>{project.goal}</dd>
            </div>
            <div>
              <dt>마감일</dt>
              <dd>
                {project.deadline}
                {dday !== null && <span className="dday"> (D-{Math.max(dday, 0)})</span>}
              </dd>
            </div>
            <div>
              <dt>팀원 {project.members.length}명</dt>
              <dd className="member-chips">
                {project.members.map((m) => (
                  <span key={m.id} className="chip">{m.name}</span>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
