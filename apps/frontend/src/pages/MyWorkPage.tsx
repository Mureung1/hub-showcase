import { endOfMonth, format, startOfMonth } from "date-fns";
import { Link } from "react-router-dom";
import { useMe } from "../features/auth";
import { usePayrollSummary } from "../features/payroll";
import {
  getHoursLabel,
  getMonthlyScheduleSummary,
  sortMonthlySchedules,
  useSchedules
} from "../features/schedule";
import { getScheduleDatePath, ROUTES } from "../shared/routes";
import { getSelectedStoreId } from "../shared/utils";

const currencyFormatter = new Intl.NumberFormat("ko-KR");

function getCurrencyLabel(amount: number) {
  return `${currencyFormatter.format(amount)}원`;
}

function getTimeLabel(time: string | null) {
  return time ? time.slice(0, 5) : "--:--";
}

export function MyWorkPage() {
  const { data: me, isLoading: isMeLoading } = useMe();
  const selectedStoreId = getSelectedStoreId();
  const selectedStore = me?.stores.find((store) => store.id === selectedStoreId);
  const currentMonth = startOfMonth(new Date());
  const fromDate = format(currentMonth, "yyyy-MM-dd");
  const toDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");
  const isWorker = selectedStore?.role === "WORKER";
  const schedulesQuery = useSchedules(selectedStoreId, fromDate, toDate, Boolean(isWorker));
  const payrollQuery = usePayrollSummary(selectedStoreId, fromDate, toDate, Boolean(isWorker));
  const schedules = schedulesQuery.data?.schedules ?? [];
  const currentUserId = me?.profile.id;
  const { myMonthHours, myMonthSchedules } = getMonthlyScheduleSummary(schedules, currentMonth, currentUserId);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const upcomingSchedules = sortMonthlySchedules(
    myMonthSchedules.filter((schedule) => schedule.workDate >= todayKey)
  ).slice(0, 4);

  if (isMeLoading) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">MY WORK</p>
          <h1>내 근무 정보를 확인 중</h1>
        </section>
      </main>
    );
  }

  if (!selectedStoreId || !selectedStore) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">MY WORK</p>
          <h1>매장을 먼저 선택해주세요.</h1>
        </section>
      </main>
    );
  }

  if (!isWorker) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">MY WORK</p>
          <h1>알바생 전용 화면입니다.</h1>
          <div className="empty-state">
            <strong>사장님은 근무표와 알바생 관리 화면에서 매장 현황을 확인할 수 있습니다.</strong>
          </div>
          <div className="auth-actions-row">
            <Link className="secondary-button" to={ROUTES.schedule}>
              근무표
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard my-work-dashboard">
      <section className="hero-row" aria-labelledby="my-work-title">
        <div>
          <p className="kicker">MY WORK</p>
          <h1 id="my-work-title">{selectedStore.name} 내 근무 정보</h1>
        </div>
        <div className="month-status">
          <span>알바생</span>
          <strong>{format(currentMonth, "yyyy년 M월")}</strong>
        </div>
      </section>

      <section className="metric-grid" aria-label="내 근무 요약">
        <article className="metric-card">
          <span>이번 달 내 근무</span>
          <strong>{myMonthSchedules.length}회</strong>
          <p>{format(currentMonth, "M월")} 확정 근무</p>
        </article>
        <article className="metric-card">
          <span>내 근무 시간</span>
          <strong>{getHoursLabel(myMonthHours)}</strong>
          <p>{upcomingSchedules.length}건 예정</p>
        </article>
        <article className="metric-card highlight">
          <span>예상 급여</span>
          <strong>{payrollQuery.isLoading ? "계산 중" : getCurrencyLabel(payrollQuery.data?.estimatedPay ?? 0)}</strong>
          <p>{selectedStore.hourlyWage === null ? "시급 미등록" : `시급 ${getCurrencyLabel(selectedStore.hourlyWage)}`}</p>
        </article>
      </section>

      <section className="content-grid">
        <section className="calendar-card" aria-label="다가오는 내 근무">
          <div className="card-head">
            <div>
              <p className="label">UPCOMING</p>
              <h2>다가오는 내 근무</h2>
            </div>
            <Link className="secondary-button inline-empty-link" to={ROUTES.schedule}>
              월간 근무표
            </Link>
          </div>

          {schedulesQuery.isLoading ? (
            <div className="empty-state schedule-message">
              <strong>근무표 조회 중</strong>
              <span>{format(currentMonth, "M월")} 내 근무를 확인하고 있습니다.</span>
            </div>
          ) : null}

          {schedulesQuery.error ? (
            <div className="empty-state schedule-message">
              <strong>근무표를 불러오지 못했습니다</strong>
              <span>{schedulesQuery.error instanceof Error ? schedulesQuery.error.message : "잠시 후 다시 시도해주세요."}</span>
            </div>
          ) : null}

          {!schedulesQuery.isLoading && !schedulesQuery.error && upcomingSchedules.length === 0 ? (
            <div className="empty-state">
              <strong>다가오는 내 근무 없음</strong>
              <span>{format(currentMonth, "M월")}에 남은 내 근무 일정이 없습니다.</span>
            </div>
          ) : null}

          {upcomingSchedules.length > 0 ? (
            <div className="request-list work-summary-list">
              {upcomingSchedules.map((schedule) => (
                <Link key={schedule.id} to={getScheduleDatePath(schedule.workDate)}>
                  <article>
                    <div>
                      <strong>{format(new Date(`${schedule.workDate}T00:00:00`), "M월 d일")}</strong>
                      <span>
                        {getTimeLabel(schedule.startTime)} - {getTimeLabel(schedule.endTime)}
                      </span>
                    </div>
                    <p className="badge">{schedule.position ?? "근무"}</p>
                  </article>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="side-stack" aria-label="내 근무 설정">
          <section className="side-card today-card">
            <p className="label">WORK INFO</p>
            <h2>{selectedStore.hourlyWage === null ? "시급 미등록" : getCurrencyLabel(selectedStore.hourlyWage)}</h2>
            <span>
              {getTimeLabel(selectedStore.defaultWorkStartTime)} - {getTimeLabel(selectedStore.defaultWorkEndTime)}
            </span>
            <div className="mini-people">
              <strong>내 근무</strong>
              <strong>{selectedStore.name}</strong>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
