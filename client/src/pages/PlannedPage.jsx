import { Link } from "react-router-dom";
import { routePaths } from "../routes/routePaths";

function PlannedPage({ title, description }) {
  return (
    <main className="placeholder-page">
      <section className="card placeholder-card">
        <span className="brand-mark" aria-hidden="true">M</span>
        <p className="eyebrow">MENTORING</p>
        <h1 className="page-title">{title}</h1>
        <p className="body-text">{description}</p>
        <Link className="button button-primary" to={routePaths.landing}>첫 화면으로</Link>
      </section>
    </main>
  );
}

export default PlannedPage;
