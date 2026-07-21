import { Link, useParams } from "react-router-dom";
import { ROUTES } from "../shared/routes";

export function ScheduleDatePage() {
  const { date } = useParams();

  return (
    <main className="dashboard">
      <section className="page-panel">
        <p className="label">DAILY SCHEDULE</p>
        <h1>{date ?? "선택한 날짜"}</h1>
        <div className="empty-state">
          <strong>일간 근무표 상세</strong>
          <span>근무 일정 조회 기능에서 연결됩니다.</span>
        </div>
        <div className="auth-actions-row">
          <Link className="secondary-button" to={ROUTES.schedule}>
            월간 근무표
          </Link>
        </div>
      </section>
    </main>
  );
}
