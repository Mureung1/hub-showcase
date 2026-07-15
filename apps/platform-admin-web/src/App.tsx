import type { MockHospitalInquiry } from "@baro-jinryo/shared";
import {
  Building2,
  Check,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  RefreshCw,
  Stethoscope,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getHospitalInquiries, reviewHospitalInquiry } from "./services/apiClient";

const pollInterval = Number(import.meta.env.VITE_WAITING_POLL_INTERVAL_MS ?? 10_000);

const statusLabel = {
  submitted: "검토 대기",
  accepted: "수락",
  rejected: "거절",
  cancelled: "신청 취소",
};

export default function App() {
  const [inquiries, setInquiries] = useState<MockHospitalInquiry[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [reviewingId, setReviewingId] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      setInquiries(await getHospitalInquiries());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), pollInterval);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function review(id: string, status: "accepted" | "rejected") {
    setReviewingId(id);
    try {
      const updated = await reviewHospitalInquiry(id, status);
      setInquiries((current) => current.map((item) => (item.id === id ? updated : item)));
    } finally {
      setReviewingId(undefined);
    }
  }

  const pendingCount = inquiries.filter((inquiry) => inquiry.status === "submitted").length;

  return (
    <div className="platform-shell">
      <header className="staff-header">
        <a className="brand" href="http://127.0.0.1:5173">
          <span className="brand-mark">
            <Stethoscope size={20} />
          </span>
          바로진료 플랫폼
        </a>
        <strong>플랫폼 관리자</strong>
        <span className="status-badge">MVP 약식 운영</span>
      </header>
      <aside className="platform-sidebar">
        <strong>관리 메뉴</strong>
        <a href="#overview">
          <LayoutDashboard size={19} /> 운영 현황
        </a>
        <a className="is-active" href="#inquiries">
          <ClipboardList size={19} /> 입점 문의
        </a>
        <span className="platform-p2-menu">
          <Building2 size={19} /> 상세 신청 검토 · 준비 중
        </span>
      </aside>
      <main className="platform-main" id="inquiries">
        <div className="platform-title-row">
          <div>
            <h1>간단 입점 문의</h1>
            <p>병원 기본정보만 확인해 상세 검증 신청 단계를 열거나 거절합니다.</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => void refresh()}>
            <RefreshCw size={18} /> 새로고침
          </button>
        </div>

        <section className="platform-metrics" id="overview">
          <div>
            <Clock3 size={21} />
            <span>검토 대기</span>
            <strong>{pendingCount}건</strong>
          </div>
          <div>
            <Check size={21} />
            <span>전체 문의</span>
            <strong>{inquiries.length}건</strong>
          </div>
        </section>

        {loadError ? (
          <section className="platform-empty">
            <h2>문의 목록을 불러오지 못했습니다</h2>
            <button className="primary-button" type="button" onClick={() => void refresh()}>
              다시 시도
            </button>
          </section>
        ) : inquiries.length === 0 ? (
          <section className="platform-empty">
            <ClipboardList size={32} />
            <h2>접수된 입점 문의가 없습니다</h2>
            <p>병원 관리자 화면에서 간단 문의를 제출하면 여기에 표시됩니다.</p>
          </section>
        ) : (
          <section className="inquiry-list" aria-label="입점 문의 목록">
            {inquiries.map((inquiry) => (
              <article className="inquiry-card" key={inquiry.id}>
                <div className="inquiry-card-heading">
                  <div>
                    <span className="inquiry-icon">
                      <Building2 size={21} />
                    </span>
                    <div>
                      <h2>{inquiry.hospitalName}</h2>
                      <p>{inquiry.primaryDepartment}</p>
                    </div>
                  </div>
                  <span className={`inquiry-status inquiry-status--${inquiry.status}`}>
                    {statusLabel[inquiry.status]}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>대표 전화번호</dt>
                    <dd>{inquiry.phoneNumber}</dd>
                  </div>
                  <div>
                    <dt>지역</dt>
                    <dd>
                      {inquiry.regionSido} {inquiry.regionSigungu}
                    </dd>
                  </div>
                  <div className="inquiry-address">
                    <dt>주소</dt>
                    <dd>{inquiry.address}</dd>
                  </div>
                </dl>
                {inquiry.status === "submitted" && (
                  <div className="inquiry-actions">
                    <button
                      className="quiet-danger-button"
                      type="button"
                      disabled={reviewingId === inquiry.id}
                      onClick={() => void review(inquiry.id, "rejected")}
                    >
                      <X size={18} />
                      거절
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={reviewingId === inquiry.id}
                      onClick={() => void review(inquiry.id, "accepted")}
                    >
                      <Check size={18} />
                      수락
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
