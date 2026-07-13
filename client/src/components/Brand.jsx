import { Link } from "react-router-dom";

function Brand({ footer = false }) {
  return (
    <Link className={`brand${footer ? " brand-footer" : ""}`} to="/" aria-label="MentorING 홈">
      {!footer && <span className="brand-mark" aria-hidden="true">M</span>}
      <span>
        Mentor<span className="brand-highlight">ING</span>
      </span>
    </Link>
  );
}

export default Brand;
