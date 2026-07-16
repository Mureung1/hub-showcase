import { Clock3, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { getApiHealth } from "../services/apiClient";

type ApiState = "checking" | "connected" | "disconnected";

interface MockHospital {
  id: string;
  name: string;
  department: string;
  district: string;
  waitingPatients: number;
  estimatedMinutes: number;
  remoteOpen: boolean;
}

const mockHospitals: MockHospital[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "서울이비인후과",
    department: "이비인후과",
    district: "서울 마포구",
    waitingPatients: 5,
    estimatedMinutes: 50,
    remoteOpen: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "연세정형외과의원",
    department: "정형외과",
    district: "서울 서대문구",
    waitingPatients: 4,
    estimatedMinutes: 40,
    remoteOpen: false,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "우리내과의원",
    department: "내과",
    district: "서울 마포구",
    waitingPatients: 0,
    estimatedMinutes: 0,
    remoteOpen: false,
  },
];

export function HospitalSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [apiState, setApiState] = useState<ApiState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    getApiHealth(controller.signal)
      .then(() => setApiState("connected"))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setApiState("disconnected");
      });

    return () => controller.abort();
  }, []);

  const filteredHospitals = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    if (!normalizedQuery) return mockHospitals;

    return mockHospitals.filter((hospital) =>
      [hospital.name, hospital.department, hospital.district].some((value) =>
        value.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
      ),
    );
  }, [query]);

  const apiLabel = {
    checking: "API 확인 중",
    connected: "API 연결됨",
    disconnected: "API 연결 안 됨",
  }[apiState];

  return (
    <div className="app-shell">
      <AppHeader apiLabel={apiLabel} apiState={apiState} />
      <main>
        <section className="search-band" aria-labelledby="search-title">
          <div className="content-width">
            <h1 id="search-title">병원 찾기</h1>
            <div className="search-control">
              <Search size={20} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="병원명, 지역 또는 진료과"
                aria-label="병원 검색"
              />
            </div>
          </div>
        </section>

        <section className="hospital-section content-width" aria-labelledby="nearby-title">
          {searchParams.get("error") && (
            <p className="notice notice--warning" role="alert">{searchParams.get("error")}</p>
          )}
          <div className="section-heading">
            <div>
              <p className="section-kicker">
                <MapPin size={16} aria-hidden="true" />내 주변
              </p>
              <h2 id="nearby-title">현재 접수 가능한 병원</h2>
            </div>
            <span className="result-count">{filteredHospitals.length}곳</span>
          </div>

          <div className="hospital-list">
            {filteredHospitals.map((hospital) => (
              <article className="hospital-card" key={hospital.id}>
                <div className="hospital-card__body">
                  <div className="hospital-card__title-row">
                    <div>
                      <h3>{hospital.name}</h3>
                      <p>
                        {hospital.department} · {hospital.district}
                      </p>
                    </div>
                    <span
                      className={
                        hospital.remoteOpen ? "status-badge" : "status-badge status-badge--closed"
                      }
                    >
                      {hospital.remoteOpen ? "원격 접수 중" : "접수 마감"}
                    </span>
                  </div>
                  <div className="waiting-summary">
                    <span>
                      <Clock3 size={17} aria-hidden="true" />앞 대기 {hospital.waitingPatients}명
                    </span>
                    <strong>
                      {hospital.estimatedMinutes > 0
                        ? `약 ${hospital.estimatedMinutes}분`
                        : "대기 없음"}
                    </strong>
                  </div>
                </div>
                <button
                  className="detail-button"
                  type="button"
                  disabled={!hospital.remoteOpen}
                  onClick={() => navigate(`/hospitals/${hospital.id}/waiting/new`)}
                >
                  {hospital.remoteOpen ? "상세 보기" : "오늘 마감"}
                </button>
              </article>
            ))}
          </div>

          {filteredHospitals.length === 0 && (
            <div className="empty-state">
              <Search size={22} aria-hidden="true" />
              <p>검색 조건에 맞는 병원이 없습니다.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
