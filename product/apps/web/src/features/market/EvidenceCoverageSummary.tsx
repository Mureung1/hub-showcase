import type { MarketAnalysis } from "../../services/marketAnalysis";
import type { CategorySelection } from "./types";

type EvidenceItem = {
  label: string;
  available: boolean;
  detail: string;
};

function evidenceItems(analysis: MarketAnalysis): EvidenceItem[] {
  return [
    {
      label: "점포·개폐업",
      available: true,
      detail: `${analysis.period} 공식 점포 집계`,
    },
    {
      label: "추정매출",
      available: analysis.raw.monthly_sales_amount !== null,
      detail:
        analysis.raw.monthly_sales_amount === null
          ? "선택 분기에 매출 자료가 없습니다."
          : `${analysis.period} 서울시 추정값`,
    },
    {
      label: "유동인구",
      available: analysis.raw.total_flow !== null,
      detail:
        analysis.raw.total_flow === null
          ? "선택 분기에 유동인구 자료가 없습니다."
          : `${analysis.period} 서울시 추정값`,
    },
  ];
}

export function EvidenceCoverageSummary({
  categorySelection,
  analysis,
}: {
  categorySelection: CategorySelection;
  analysis: MarketAnalysis | null;
}) {
  if (categorySelection.coverage !== "full" || analysis === null) return null;

  const items = evidenceItems(analysis);
  const availableCount = items.filter((item) => item.available).length;
  const missing = items.filter((item) => !item.available);

  return (
    <section className="evidence-coverage-summary" aria-label="분석 자료 확인 상태">
      <div className="evidence-coverage-heading">
        <div>
          <span>이번 분석에 사용한 자료</span>
          <strong>
            {items.length}개 중 {availableCount}개 확인
          </strong>
        </div>
        <small>{analysis.period} 기준</small>
      </div>

      <ul>
        {items.map((item) => (
          <li key={item.label} className={item.available ? "is-available" : "is-missing"}>
            <span aria-hidden="true">{item.available ? "✓" : "!"}</span>
            <div>
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </div>
          </li>
        ))}
      </ul>

      <p>
        {missing.length === 0
          ? "현재 선택 분기의 핵심 자료가 모두 확인되었습니다. 그래도 실제 임대료와 현장 유동은 별도로 확인해야 합니다."
          : `${missing.map((item) => item.label).join("·")} 자료가 없어 확인 가능한 지표 중심으로 분석했습니다. 누락 자료는 점수의 확실성을 낮출 수 있습니다.`}
      </p>
    </section>
  );
}
