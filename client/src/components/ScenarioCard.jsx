export const SEMESTERS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];

function ComparisonBadge({ label, current, needed }) {
  if (needed == null) {
    return (
      <div className="badge">
        {label}
        <b>{current}학점</b>
      </div>
    );
  }

  const met = current >= needed;
  return (
    <div className={`badge ${met ? 'badge-done' : 'badge-warning'}`}>
      {label}
      <b>
        {current}/{needed}
        {met ? ' ✓' : ''}
      </b>
    </div>
  );
}

function ScenarioCard({
  scenario,
  courses,
  subtotal,
  needed,
  active,
  canDelete,
  onFocus,
  onDelete,
  onRename,
  onSemesterChange,
  onOpenCourseModal,
}) {
  return (
    <div
      className={`scenario-card ${active ? 'active' : 'dimmed'}`}
      onClick={!active ? onFocus : undefined}
    >
      <div className="scenario-card-header">
        <input
          type="text"
          value={scenario.name}
          onChange={(e) => onRename(e.target.value)}
          aria-label="계획안 이름"
        />
        {canDelete && (
          <button
            type="button"
            className="scenario-delete"
            onClick={onDelete}
            aria-label="계획안 삭제"
          >
            삭제
          </button>
        )}
      </div>

      <select value={scenario.semester} onChange={(e) => onSemesterChange(e.target.value)}>
        {SEMESTERS.map((semester) => (
          <option key={semester} value={semester}>
            {semester}
          </option>
        ))}
      </select>

      <button type="button" className="cta" onClick={onOpenCourseModal}>
        과목 담기
      </button>

      <div className="scenario-tags">
        {courses.length === 0 && <p className="sub">담긴 과목이 없어요</p>}
        {courses.map((course) => (
          <span className="scenario-tag" key={course.id}>
            {course.name} · {course.credits}학점
          </span>
        ))}
      </div>

      <div className="badges">
        <ComparisonBadge label="총학점" current={subtotal.total} needed={needed?.total} />
        <ComparisonBadge label="전공" current={subtotal.major} needed={needed?.major} />
        <ComparisonBadge label="교양" current={subtotal.general} needed={needed?.general} />
        <ComparisonBadge label="종합설계" current={subtotal.capstone} />
        <ComparisonBadge label="창업교과목" current={subtotal.startup} />
      </div>
    </div>
  );
}

export default ScenarioCard;
