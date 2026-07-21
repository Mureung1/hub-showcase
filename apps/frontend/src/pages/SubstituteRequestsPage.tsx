import { Link } from "react-router-dom";
import { ROUTES } from "../shared/routes";

export function SubstituteRequestsPage() {
  return (
    <main className="auth-stage">
      <section className="auth-card store-select-card">
        <p className="label">SUBSTITUTE</p>
        <h1>공개 대타 요청</h1>
        <div className="empty-state">
          <strong>신청 가능한 요청이 표시됩니다.</strong>
          <span>대타 요청 목록 기능에서 연결됩니다.</span>
        </div>
        <div className="auth-actions-row">
          <Link className="primary-button" to={ROUTES.newSubstituteRequest}>
            요청 등록
          </Link>
        </div>
      </section>
    </main>
  );
}
