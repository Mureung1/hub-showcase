import type { HospitalChangeRequestView, MockHospitalInquiry } from "@baro-jinryo/shared";
import {
  Building2,
  Check,
  ClipboardList,
  Clock3,
  FilePenLine,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Stethoscope,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePlatformAuth } from "./auth/PlatformAuthContext";
import { PlatformLoginPage } from "./pages/PlatformLoginPage";
import {
  getHospitalChangeRequests,
  getHospitalInquiries,
  reviewHospitalChangeRequest,
  reviewHospitalInquiry,
} from "./services/apiClient";

const pollInterval = Number(import.meta.env.VITE_WAITING_POLL_INTERVAL_MS ?? 10_000);
const inquiryStatusLabel = {
  submitted: "검토 대기",
  accepted: "수락",
  rejected: "거절",
  cancelled: "신청 취소",
};
const changeStatusLabel = { pending: "검토 대기", approved: "승인", rejected: "거절" };
const fieldLabels = {
  name: "병원명",
  primaryDepartment: "대표 진료과",
  phoneNumber: "대표 전화번호",
  regionSido: "시·도",
  regionSigungu: "시·군·구",
  address: "주소",
  operatingHoursText: "운영 시간 안내",
};

type View = "inquiries" | "changes";

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/^\+82/, "0").replace(/\D/g, "");
  if (digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, -4)}-${digits.slice(-4)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, -4)}-${digits.slice(-4)}`;
}

function PlatformApp() {
  const { session, profile, loading, signOut } = usePlatformAuth();
  const [view, setView] = useState<View>("changes");
  const [inquiries, setInquiries] = useState<MockHospitalInquiry[]>([]);
  const [changes, setChanges] = useState<HospitalChangeRequestView[]>([]);
  const [loadError, setLoadError] = useState("");
  const [reviewingId, setReviewingId] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const [nextInquiries, nextChanges] = await Promise.all([
        getHospitalInquiries(),
        getHospitalChangeRequests(),
      ]);
      setInquiries(nextInquiries);
      setChanges(nextChanges);
      setLoadError("");
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "관리 목록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    if (!session || profile?.accountType !== "platform_admin") return;
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), pollInterval);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [profile, refresh, session]);

  if (loading) return null;
  if (!session || profile?.accountType !== "platform_admin") return <PlatformLoginPage />;

  async function reviewInquiry(id: string, status: "accepted" | "rejected") {
    setReviewingId(id);
    setLoadError("");
    try {
      const updated = await reviewHospitalInquiry(id, status);
      setInquiries((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "입점 문의를 처리하지 못했습니다.");
    } finally {
      setReviewingId(undefined);
    }
  }

  async function reviewChange(id: string, status: "approved" | "rejected") {
    setReviewingId(id);
    setLoadError("");
    try {
      const updated = await reviewHospitalChangeRequest(id, status);
      setChanges((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "병원 정보 변경 요청을 처리하지 못했습니다.");
    } finally {
      setReviewingId(undefined);
    }
  }

  const pendingInquiryCount = inquiries.filter((item) => item.status === "submitted").length;
  const pendingChangeCount = changes.filter((item) => item.status === "pending").length;

  return (
    <div className="platform-shell">
      <header className="staff-header">
        <a className="brand" href="http://127.0.0.1:5173">
          <span className="brand-mark"><Stethoscope size={20} /></span>
          바로진료 플랫폼
        </a>
        <strong>플랫폼 관리자</strong>
        <button className="secondary-button compact" type="button" onClick={() => void signOut()}>
          <LogOut size={17} /> 로그아웃
        </button>
      </header>
      <aside className="platform-sidebar">
        <strong>관리 메뉴</strong>
        <span className="platform-menu-label"><LayoutDashboard size={19} /> 운영 현황</span>
        <button className={view === "inquiries" ? "is-active" : ""} type="button" onClick={() => setView("inquiries")}>
          <ClipboardList size={19} /> 입점 문의 <small>{pendingInquiryCount}</small>
        </button>
        <button className={view === "changes" ? "is-active" : ""} type="button" onClick={() => setView("changes")}>
          <FilePenLine size={19} /> 병원 정보 변경사항 <small>{pendingChangeCount}</small>
        </button>
        <span className="platform-p2-menu"><Building2 size={19} /> 상세 신청 검토 · 준비 중</span>
      </aside>
      <main className="platform-main">
        <div className="platform-title-row">
          <div>
            <h1>{view === "changes" ? "병원 정보 변경사항" : "간단 입점 문의"}</h1>
            <p>{view === "changes" ? "병원이 제출한 변경 전·후 정보를 비교해 반영 여부를 결정합니다." : "병원 기본정보를 확인해 상세 검증 신청 단계를 열거나 거절합니다."}</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => void refresh()}><RefreshCw size={18} /> 새로고침</button>
        </div>
        <section className="platform-metrics">
          <div><Clock3 size={21} /><span>현재 검토 대기</span><strong>{view === "changes" ? pendingChangeCount : pendingInquiryCount}건</strong></div>
          <div><Check size={21} /><span>전체 요청</span><strong>{view === "changes" ? changes.length : inquiries.length}건</strong></div>
        </section>
        {loadError ? (
          <section className="platform-empty"><h2>목록을 불러오지 못했습니다</h2><p>{loadError}</p><button className="primary-button" type="button" onClick={() => void refresh()}>다시 시도</button></section>
        ) : view === "changes" ? (
          <ChangeRequestList items={changes} reviewingId={reviewingId} onReview={reviewChange} />
        ) : (
          <InquiryList items={inquiries} reviewingId={reviewingId} onReview={reviewInquiry} />
        )}
      </main>
    </div>
  );
}

function ChangeRequestList({ items, reviewingId, onReview }: {
  items: HospitalChangeRequestView[];
  reviewingId: string | undefined;
  onReview: (id: string, status: "approved" | "rejected") => Promise<void>;
}) {
  if (items.length === 0) return <section className="platform-empty"><FilePenLine size={32} /><h2>병원 정보 변경 요청이 없습니다</h2></section>;
  return (
    <section className="inquiry-list" aria-label="병원 정보 변경 요청 목록">
      {items.map((item) => (
        <article className="inquiry-card change-request-card" key={item.id}>
          <div className="inquiry-card-heading">
            <div><span className="inquiry-icon"><FilePenLine size={21} /></span><div><h2>{item.hospitalName}</h2><p>{new Date(item.submittedAt).toLocaleString("ko-KR")}</p></div></div>
            <span className={`inquiry-status inquiry-status--${item.status}`}>{changeStatusLabel[item.status]}</span>
          </div>
          <div className="change-comparison">
            <strong>항목</strong><strong>현재 정보</strong><strong>변경 요청</strong>
            {Object.entries(fieldLabels).map(([key, label]) => {
              const field = key as keyof typeof item.currentValues;
              const changed = item.currentValues[field] !== item.proposedValues[field];
              const currentValue = field === "phoneNumber" ? formatPhoneNumber(item.currentValues[field]) : item.currentValues[field];
              const proposedValue = field === "phoneNumber" ? formatPhoneNumber(item.proposedValues[field]) : item.proposedValues[field];
              return <div className={changed ? "is-changed" : ""} key={key}><span>{label}</span><span>{currentValue || "-"}</span><span>{proposedValue || "-"}</span></div>;
            })}
          </div>
          {item.status === "pending" && <div className="inquiry-actions"><button className="quiet-danger-button" type="button" disabled={reviewingId === item.id} onClick={() => void onReview(item.id, "rejected")}><X size={18} /> 거절</button><button className="primary-button" type="button" disabled={reviewingId === item.id} onClick={() => void onReview(item.id, "approved")}><Check size={18} /> 승인 후 반영</button></div>}
        </article>
      ))}
    </section>
  );
}

function InquiryList({ items, reviewingId, onReview }: {
  items: MockHospitalInquiry[];
  reviewingId: string | undefined;
  onReview: (id: string, status: "accepted" | "rejected") => Promise<void>;
}) {
  if (items.length === 0) return <section className="platform-empty"><ClipboardList size={32} /><h2>접수된 입점 문의가 없습니다</h2></section>;
  return <section className="inquiry-list" aria-label="입점 문의 목록">{items.map((item) => <article className="inquiry-card" key={item.id}><div className="inquiry-card-heading"><div><span className="inquiry-icon"><Building2 size={21} /></span><div><h2>{item.hospitalName}</h2><p>{item.primaryDepartment}</p></div></div><span className={`inquiry-status inquiry-status--${item.status}`}>{inquiryStatusLabel[item.status]}</span></div><dl><div><dt>대표 전화번호</dt><dd>{item.phoneNumber}</dd></div><div><dt>지역</dt><dd>{item.regionSido} {item.regionSigungu}</dd></div><div className="inquiry-address"><dt>주소</dt><dd>{item.address}</dd></div></dl>{item.status === "submitted" && <div className="inquiry-actions"><button className="quiet-danger-button" type="button" disabled={reviewingId === item.id} onClick={() => void onReview(item.id, "rejected")}><X size={18} /> 거절</button><button className="primary-button" type="button" disabled={reviewingId === item.id} onClick={() => void onReview(item.id, "accepted")}><Check size={18} /> 수락</button></div>}</article>)}</section>;
}

export default function App() {
  return <PlatformApp />;
}
