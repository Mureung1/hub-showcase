import { Link } from "react-router-dom";
import { applications } from "../data/applications";
import { routePaths } from "../routes/routePaths";

function MenteeApplicationListPage() {
  return (
    <main className="placeholder-page">
      <section className="card placeholder-card">
        <span className="brand-mark" aria-hidden="true">M</span>
        <p className="eyebrow">MENTEE APPLICATIONS</p>
        <h1 className="page-title">면담 신청 목록</h1>
        <p className="body-text">
          면담 신청 목록 화면을 위한 경로와 mock 데이터 {applications.length}건이 준비되었습니다.
        </p>
        <Link className="button button-primary" to={routePaths.menteeMentors}>
          멘토 프로필 목록으로
        </Link>
      </section>
    </main>
  );
}

export default MenteeApplicationListPage;
