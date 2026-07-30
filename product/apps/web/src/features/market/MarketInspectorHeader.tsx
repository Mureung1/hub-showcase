import { X } from "lucide-react";

import type { AnalysisTopic, CategorySelection, Market, MarketStore } from "./types";
import type { AnalysisState } from "./useMarketAnalysis";

function analysisTopicLabel(topic: AnalysisTopic) {
  if (topic === "overview") return "종합 분석";
  if (topic === "stores") return "점포·개폐업";
  if (topic === "competition") return "경쟁 현황";
  if (topic === "sales") return "매출·소비";
  if (topic === "population") return "주거·직장인구";
  return "유동인구";
}

export function InspectorHeader({
  market,
  selected,
  categorySelection,
  categoryCoverageReason,
  topic,
  analysisState,
  onAnalysisRetry,
  onClosePanel,
  onClearSelection,
}: {
  market: Market;
  selected: MarketStore | null;
  categorySelection: CategorySelection;
  categoryCoverageReason: string;
  topic: AnalysisTopic;
  analysisState: AnalysisState;
  onAnalysisRetry: () => void;
  onClosePanel: () => void;
  onClearSelection: () => void;
}) {
  const coverageLabel =
    categorySelection.coverage === "full"
      ? "상세 분석 지원 업종"
      : categorySelection.coverage === "partial"
        ? "점포 위치·경쟁만 제공"
        : "선택 상권에 점포 없음";
  const coverageDetail =
    categorySelection.coverage === "full"
      ? "이 업종은 상세 분석 대상입니다. 실제 제공 자료는 선택한 분기별로 다릅니다."
      : categoryCoverageReason;

  return (
    <>
      <div className="inspector-title">
        <div>
          <p>{selected?.name ?? market.name}</p>
          <span>
            {selected
              ? `${selected.category} · ${selected.address ?? market.address}`
              : `${categorySelection.name} · 상권 분석`}
          </span>
        </div>
        <div className="inspector-actions">
          {selected && (
            <button type="button" className="text-button" onClick={onClearSelection}>
              점포 선택 해제
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label="분석 결과 닫기"
            onClick={onClosePanel}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className={`inspector-coverage is-${categorySelection.coverage}`} role="status">
        <b>{categorySelection.name}</b>
        <span>{coverageLabel}</span>
        <p>{coverageDetail}</p>
      </div>
      <p className="inspector-topic" aria-live="polite">
        {analysisTopicLabel(topic)}
      </p>
      {analysisState === "error" && categorySelection.coverage === "full" && (
        <div className="nearby-state is-error" role="alert">
          <b>상권 분석 데이터를 불러오지 못했습니다.</b>
          <span>예시 값으로 바꾸지 않았습니다. 연결을 확인한 뒤 다시 시도해 주세요.</span>
          <button type="button" onClick={onAnalysisRetry}>
            다시 시도
          </button>
        </div>
      )}
    </>
  );
}
