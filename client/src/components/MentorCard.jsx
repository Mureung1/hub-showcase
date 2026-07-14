import { Link } from "react-router-dom";

function MentorCard({ mentor, selected = false, onSelect }) {
  const detailPath = `/mentee/mentors/${mentor.id}`;

  return (
    <article className={`card mentor-card${selected ? " mentor-card-selected" : ""}`}>
      <div className="mentor-card-header">
        <label className="mentor-select-control">
          <input
            className="mentor-select-input"
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect?.(event.target.checked)}
          />
          <span className="mentor-check-icon" aria-hidden="true" />
          <span className="sr-only">{mentor.name} 멘토 선택</span>
        </label>

        <div className="mentor-card-summary">
          <div className="mentor-card-title-row">
            <h2 className="card-title">{mentor.name} 멘토</h2>
            <span className="mentor-program">{mentor.program}</span>
          </div>
          <p className="body-text mentor-introduction">{mentor.introduction}</p>
        </div>
      </div>

      <div className="mentor-card-content">
        <div className="tag-list" aria-label="연구 주제">
          {mentor.keywords.map((keyword) => (
            <span className="tag" key={keyword}>#{keyword}</span>
          ))}
        </div>

        <dl className="mentor-meta-grid">
          <div className="card-muted-box mentor-meta-item">
            <dt>전공</dt>
            <dd>{mentor.major}</dd>
          </div>
          <div className="card-muted-box mentor-meta-item">
            <dt>연구실</dt>
            <dd>{mentor.lab}</dd>
          </div>
          <div className="card-muted-box mentor-meta-item">
            <dt>면담 가능</dt>
            <dd>{mentor.availableTime}</dd>
          </div>
        </dl>

        <Link className="button button-soft mentor-detail-button" to={detailPath}>
          프로필 상세 보기
        </Link>
      </div>
    </article>
  );
}

export default MentorCard;
