import { Link } from "react-router-dom";
import "./EmptyState.css";

function EmptyState({ message, actionLabel }) {
  return (
    <div className="empty-state">
      {message}
      <div>
        <Link className="btn btn-primary" to="/register">
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

export default EmptyState;
