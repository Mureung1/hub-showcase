import { Clock3, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import {
  koreanAdministrativeDistricts,
  koreanProvinces,
  medicalDepartments,
} from "../data/hospitalSearchFilters";
import { getApiHealth, getPatientConfig } from "../services/apiClient";
import { filterHospitalsByQuery } from "../utils/filterHospitals";

type ApiState = "checking" | "connected" | "disconnected";
type DevelopmentHospitalDataState = "loading" | "ready" | "unavailable";
const developmentHospitalId = "10000000-0000-4000-8000-000000000001";

interface MockHospital {
  id: string;
  name: string;
  department: string;
  district: string;
  waitingPatients: number;
  estimatedMinutes: number;
  remoteOpen: boolean;
}

interface HospitalSearchState {
  hospitals: MockHospital[];
  province: string;
  cityDistrict: string;
  department: string;
}

type HospitalSearchAction =
  | { type: "refreshHospital"; hospital: MockHospital }
  | { type: "selectProvince"; province: string }
  | { type: "selectCityDistrict"; cityDistrict: string }
  | { type: "selectDepartment"; department: string };

const mockHospitals: MockHospital[] = [
  {
    id: developmentHospitalId,
    name: "서울이비인후과",
    department: "이비인후과",
    district: "서울특별시 마포구",
    waitingPatients: 0,
    estimatedMinutes: 0,
    remoteOpen: false,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "연세정형외과의원",
    department: "정형외과",
    district: "서울특별시 서대문구",
    waitingPatients: 4,
    estimatedMinutes: 40,
    remoteOpen: false,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "우리내과의원",
    department: "내과",
    district: "서울특별시 마포구",
    waitingPatients: 0,
    estimatedMinutes: 0,
    remoteOpen: false,
  },
];

function hospitalSearchReducer(
  state: HospitalSearchState,
  action: HospitalSearchAction,
): HospitalSearchState {
  if (action.type === "selectProvince") {
    return { ...state, province: action.province, cityDistrict: "" };
  }

  if (action.type === "selectCityDistrict") {
    return { ...state, cityDistrict: action.cityDistrict };
  }

  if (action.type === "selectDepartment") {
    return { ...state, department: action.department };
  }

  const hospitals = state.hospitals.map((hospital) =>
    hospital.id === action.hospital.id ? action.hospital : hospital,
  );
  return { ...state, hospitals };
}

export function HospitalSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [developmentHospitalDataState, setDevelopmentHospitalDataState] =
    useState<DevelopmentHospitalDataState>("loading");
  const [{ hospitals, province, cityDistrict, department }, dispatch] = useReducer(
    hospitalSearchReducer,
    {
      hospitals: mockHospitals,
      province: "",
      cityDistrict: "",
      department: "",
    },
  );

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

  useEffect(() => {
    let active = true;
    const refreshDevelopmentHospital = async () => {
      try {
        const config = await getPatientConfig(developmentHospitalId);
        if (!active) return;
        dispatch({
          type: "refreshHospital",
          hospital: {
            id: config.hospital.id,
            name: config.hospital.name,
            department: config.hospital.department,
            district: config.hospital.district,
            waitingPatients: config.waitingPatients,
            estimatedMinutes: config.estimatedMinutes,
            remoteOpen: config.queueStatus === "open",
          },
        });
        setDevelopmentHospitalDataState("ready");
      } catch {
        if (!active) return;
        setDevelopmentHospitalDataState((current) =>
          current === "ready" ? current : "unavailable",
        );
      }
    };
    void refreshDevelopmentHospital();
    const timer = window.setInterval(() => void refreshDevelopmentHospital(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const cityDistricts = province
    ? (koreanAdministrativeDistricts[province as keyof typeof koreanAdministrativeDistricts] ?? [])
    : [];
  const filteredHospitals = useMemo(
    () => filterHospitalsByQuery(hospitals, query, { province, cityDistrict }, department),
    [hospitals, query, province, cityDistrict, department],
  );

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
            <div className="region-filters">
              <select
                aria-label="시·도 선택"
                value={province}
                onChange={(event) =>
                  dispatch({ type: "selectProvince", province: event.target.value })
                }
              >
                <option value="">시·도 전체</option>
                {koreanProvinces.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                aria-label="시·군·구 선택"
                value={cityDistrict}
                disabled={!province}
                onChange={(event) =>
                  dispatch({
                    type: "selectCityDistrict",
                    cityDistrict: event.target.value,
                  })
                }
              >
                <option value="">시·군·구 전체</option>
                {cityDistricts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                aria-label="대표 진료과 선택"
                value={department}
                onChange={(event) =>
                  dispatch({
                    type: "selectDepartment",
                    department: event.target.value,
                  })
                }
              >
                <option value="">대표 진료과 전체</option>
                {medicalDepartments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="hospital-section content-width" aria-labelledby="nearby-title">
          {searchParams.get("error") && (
            <p className="notice notice--warning" role="alert">
              {searchParams.get("error")}
            </p>
          )}
          <div className="section-heading">
            <div>
              <p className="section-kicker">
                <MapPin size={16} aria-hidden="true" />내 주변
              </p>
              <h2 id="nearby-title">현재 접수 가능한 병원</h2>
            </div>
            <span className="result-count" aria-live="polite">
              {filteredHospitals.length}곳
            </span>
          </div>

          <div className="hospital-list">
            {filteredHospitals.map((hospital) => {
              const usesLiveQueueData = hospital.id === developmentHospitalId;
              const isQueueDataLoading =
                usesLiveQueueData && developmentHospitalDataState === "loading";
              const isQueueDataUnavailable =
                usesLiveQueueData && developmentHospitalDataState === "unavailable";
              const canShowQueueData =
                !usesLiveQueueData || developmentHospitalDataState === "ready";
              const canOpenDetails = canShowQueueData && hospital.remoteOpen;

              return (
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
                          canOpenDetails ? "status-badge" : "status-badge status-badge--closed"
                        }
                      >
                        {isQueueDataLoading
                          ? "현황 확인 중"
                          : isQueueDataUnavailable
                            ? "현황 조회 실패"
                            : hospital.remoteOpen
                              ? "원격 접수 중"
                              : "접수 마감"}
                      </span>
                    </div>
                    <div className="waiting-summary">
                      {canShowQueueData ? (
                        <>
                          <span>
                            <Clock3 size={17} aria-hidden="true" />앞 대기{" "}
                            {hospital.waitingPatients}명
                          </span>
                          <strong>
                            {hospital.estimatedMinutes > 0
                              ? `약 ${hospital.estimatedMinutes}분`
                              : "대기 없음"}
                          </strong>
                        </>
                      ) : (
                        <span>
                          <Clock3 size={17} aria-hidden="true" />
                          {isQueueDataLoading
                            ? "대기 현황 확인 중"
                            : "대기 현황을 불러오지 못했습니다"}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="detail-button"
                    type="button"
                    disabled={!canOpenDetails}
                    onClick={() => navigate(`/hospitals/${hospital.id}/waiting/new`)}
                  >
                    {isQueueDataLoading
                      ? "확인 중"
                      : isQueueDataUnavailable
                        ? "새로고침 후 다시 시도"
                        : hospital.remoteOpen
                          ? "상세 보기"
                          : "오늘 마감"}
                  </button>
                </article>
              );
            })}
          </div>

          {filteredHospitals.length === 0 && (
            <div className="empty-state" role="status">
              <Search size={22} aria-hidden="true" />
              <p>검색 조건에 맞는 병원이 없습니다.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
