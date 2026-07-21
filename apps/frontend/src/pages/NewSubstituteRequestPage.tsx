import { Link } from "react-router-dom";
import { ROUTES } from "../shared/routes";

export function NewSubstituteRequestPage() {
  return (
    <main className="auth-stage">
      <section className="auth-card store-select-card">
        <p className="label">SUBSTITUTE</p>
        <h1>대타 요청 등록</h1>
        <div className="empty-state">
          <strong>내 근무를 선택해 공개 요청을 등록합니다.</strong>
          <span>대타 요청 등록 기능에서 연결됩니다.</span>
        </div>
        <div className="auth-actions-row">
          <Link className="secondary-button" to={ROUTES.substituteRequests}>
            요청 목록
          </Link>
        </div>
      </section>
    </main>
  );
}
