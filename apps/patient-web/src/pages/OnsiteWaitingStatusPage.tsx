import type { MockOnsiteWaitingStatus } from "@baro-jinryo/shared";
import { formatPatientCounts } from "@baro-jinryo/shared";
import { Clock3, Info, MapPin, Phone, Stethoscope, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { getOnsiteWaitingStatus } from "../services/apiClient";

const pollInterval = Number(import.meta.env.VITE_WAITING_POLL_INTERVAL_MS ?? 10_000);

export function OnsiteWaitingStatusPage() {
  const { lookupToken = "" } = useParams();
  const [status, setStatus] = useState<MockOnsiteWaitingStatus | null>();
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getOnsiteWaitingStatus(lookupToken));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [lookupToken]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), pollInterval);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refresh]);

  if (status === undefined) {
    if (loadError) {
      return (
        <div className="app-shell">
          <AppHeader />
          <main className="onsite-status-page content-width">
            <div className="patient-empty-state">
              <Info size={32} />
              <h1>상태를 불러오지 못했습니다</h1>
              <button className="primary-button" type="button" onClick={() => void refresh()}>
                다시 시도
              </button>
            </div>
          </main>
        </div>
      );
    }
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="onsite-status-page content-width">
          <div className="patient-empty-state" aria-live="polite">
            <Clock3 size={32} />
            <h1>현재 대기 상태를 확인하고 있습니다</h1>
          </div>
        </main>
      </div>
    );
  }

  if (status === null) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="onsite-status-page content-width">
          <div className="patient-empty-state">
            <Info size={32} />
            <h1>종료된 웨이팅입니다</h1>
            <p>진료실 호출 또는 취소로 상태 조회 링크가 만료되었습니다.</p>
          </div>
        </main>
      </div>
    );
  }

  const { hospital, waiting } = status;
  const isHeld = waiting.entry.status === "held";

  return (
    <div className="app-shell patient-app-shell">
      <AppHeader />
      <main className="onsite-status-page">
        <section className="onsite-clinic-summary">
          <span className="onsite-clinic-icon">
            <Stethoscope size={24} />
          </span>
          <div>
            <h1>{hospital.name}</h1>
            <p>{hospital.specialty}</p>
          </div>
          <span className="status-badge">현장 접수 완료</span>
        </section>

        <section className="onsite-status-panel" aria-live="polite">
          <div className="onsite-ticket-row">
            <span>접수번호</span>
            <strong>{waiting.entry.ticketNumber}</strong>
            <small>{formatPatientCounts(waiting.entry)}</small>
          </div>
          <div className="patient-position-grid">
            <div>
              <UsersRound size={22} />
              <span>현재 진료 대기 순서</span>
              <strong>{waiting.position ? `${waiting.position}번째` : "확인 중"}</strong>
            </div>
            <div>
              <Clock3 size={22} />
              <span>참고용 예상 대기</span>
              <strong>
                {waiting.estimatedMinutes === null ? "확인 중" : `약 ${waiting.estimatedMinutes}분`}
              </strong>
            </div>
          </div>
          {isHeld && (
            <div className="notice notice--warning">
              <Info size={20} />
              <div>
                <strong>병원에서 순서를 확인하고 있습니다</strong>
                <p>확인이 끝나면 대기 순서가 다시 표시됩니다.</p>
              </div>
            </div>
          )}
          <p className="advisory-copy">
            <Info size={16} /> 예상 시간은 참고용이며 진료 상황에 따라 달라질 수 있습니다.
          </p>
        </section>

        <section className="onsite-contact-panel">
          <div>
            <MapPin size={19} />
            <span>{hospital.address}</span>
          </div>
          <div>
            <Phone size={19} />
            <span>{hospital.phoneNumber}</span>
          </div>
          <div className="notice notice--info">
            <Info size={20} />
            <div>
              <strong>현장 접수 후 웨이팅 취소는 전화 상담이 필요합니다</strong>
              <p>병원에 전화해 접수번호를 알려주세요.</p>
            </div>
          </div>
          <a className="primary-button onsite-call-button" href={`tel:${hospital.phoneNumber}`}>
            <Phone size={18} /> 병원에 전화하기
          </a>
        </section>
      </main>
    </div>
  );
}
