import { CircleHelp, FileText, MapPinned } from "lucide-react";

import type { ProductWorkspaceModel } from "./useProductWorkspaceModel";

function PeriodSelect({
  periods,
  availability,
  value,
  onChange,
}: {
  periods: string[];
  availability: Record<string, Array<"stores" | "sales" | "flow">>;
  value: string;
  onChange: (period: string) => void;
}) {
  const options = periods.length > 0 ? periods : value ? [value] : [];
  const formatPeriod = (period: string) => `${period.slice(0, 4)}년 ${period.slice(4)}분기`;
  const formatAvailability = (period: string) => {
    const available = availability[period] ?? [];
    return available.includes("sales") && available.includes("flow")
      ? "전체 분석"
      : "점포·개폐업";
  };
  return (
    <label className="header-control period-control">
      <span className="sr-only">분석 데이터 분기</span>
      <select
        aria-label="분석 데이터 분기"
        value={value}
        disabled={periods.length <= 1}
        title={
          periods.length <= 1
            ? "현재 선택 가능한 분기는 한 개입니다."
            : "분기별로 실제 적재된 데이터 범위를 확인하며 선택합니다."
        }
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((period) => (
          <option key={period} value={period}>
            {`${formatPeriod(period)} · ${formatAvailability(period)}`}
          </option>
        ))}
        {!value && <option value="">분기 확인 중</option>}
      </select>
    </label>
  );
}

export function WorkspaceHeader({ model }: { model: ProductWorkspaceModel }) {
  const { marketKey, period, setPeriod } = model.selection;
  const { availablePeriods, periodAvailability, analysisSource, analysisState, retryAnalysis } =
    model.marketData.marketAnalysis;
  const { categorySelection } = model.selection;
  const { setCompareOpen, setEvidenceOpen, setFiltersOpen, setReportOpen } = model.panels;
  const { state: apiState, retry: retryApiReadiness } = model.apiReadiness;

  return (
    <>
      <header className="app-header">
        <a className="brand" href="/" aria-label="LocalTwin 상권 분석 홈">
          <span className="brand-mark">
            <span />
          </span>
          <span>LocalTwin</span>
        </a>
        <nav className="primary-nav" aria-label="주요 메뉴">
          <button className="nav-item is-active" type="button">
            상권 분석
          </button>
          <button className="nav-item" type="button" onClick={() => setCompareOpen(true)}>
            상권 비교
          </button>
          <button className="nav-item" type="button" onClick={() => setEvidenceOpen(true)}>
            데이터 기준
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => {
              if (document.documentElement.classList.contains("is-english")) {
                window.print();
                return;
              }
              setReportOpen(true);
            }}
          >
            보고서
          </button>
        </nav>
        <div className="header-actions">
          <a
            className="header-control header-docs"
            href={
              import.meta.env.VITE_DOCS_URL ??
              "https://hub-localtwin-docs-vercel.vercel.app/docs/wiki/doc-viewer.html?doc=Home.md"
            }
          >
            <FileText size={16} /> Docs
          </a>
          <button className="header-control" type="button" onClick={() => setFiltersOpen(true)}>
            <MapPinned size={16} /> 상권 선택: {marketKey}
          </button>
          <PeriodSelect
            periods={availablePeriods}
            availability={periodAvailability}
            value={period}
            onChange={setPeriod}
          />
          <button
            className="icon-button"
            type="button"
            title="데이터 도움말"
            onClick={() => setEvidenceOpen(true)}
          >
            <CircleHelp size={19} />
          </button>
        </div>
      </header>
      <section className="demo-note" aria-label="데모 데이터 안내">
        <span className="pulse-dot" />
        {apiState === "checking"
          ? "분석 서버 연결을 확인하는 중입니다."
          : apiState === "waking"
            ? "분석 서버를 준비하고 있습니다. 준비되면 현재 조건의 최신 데이터를 자동으로 불러옵니다."
            : apiState === "unavailable"
              ? "분석 서버에 연결하지 못했습니다. 예시 데이터로 대체하지 않았습니다."
              : analysisState === "loading"
                ? "서울 상권분석 공식 데이터를 불러오는 중입니다."
                : analysisState === "error"
                  ? "상권 분석 API에 연결하지 못했습니다. 예시 값으로 대체하지 않았습니다."
                  : analysisState === "unavailable"
                    ? `${categorySelection.name}은 점포 위치와 반경 경쟁 지표만 제공합니다.`
                    : analysisSource === "demo"
                      ? "Demo mode · 검증 snapshot 예시이며 실제 조회 결과가 아닙니다."
                      : `서울 상권분석 ${period.slice(0, 4)}년 ${period.slice(4)}분기 API 결과입니다.`}{" "}
        {(apiState === "unavailable" || analysisState === "error") && (
          <button
            type="button"
            onClick={apiState === "unavailable" ? retryApiReadiness : retryAnalysis}
          >
            다시 시도
          </button>
        )}
        <button type="button" onClick={() => setEvidenceOpen(true)}>
          데이터 범위 보기
        </button>
      </section>
    </>
  );
}
