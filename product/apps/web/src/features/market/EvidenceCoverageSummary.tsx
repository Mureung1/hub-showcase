import type { MarketAnalysis } from "../../services/marketAnalysis";
import type { CategorySelection } from "./types";

type EvidenceItem = {
  label: string;
  available: boolean;
  detail: string;
};

function formatQuarterPeriod(period: string) {
  const match = /^(\d{4})([1-4])$/.exec(period);
  return match ? `${match[1]}년 ${match[2]}분기` : period;
}

function evidenceItems(analysis: MarketAnalysis): EvidenceItem[] {
  const period = formatQuarterPeriod(analysis.period);
  return [
    {
      label: "점포·개폐업",
      available: true,
      detail: `${period} 서울시 공식 점포 집계`,
    },
    {
      label: "상권·업종 추정매출",
      available: analysis.raw.monthly_sales_amount !== null,
      detail:
        analysis.raw.monthly_sales_amount === null
          ? "선택 분기에 추정매출 자료가 없습니다."
          : `${period} 서울시 추정값 · 개별 점포 매출 아님`,
    },
    {
      label: "유동인구",
      available: analysis.raw.total_flow !== null,
      detail:
        analysis.raw.total_flow === null
          ? "선택 분기에 유동인구 자료가 없습니다."
          : `${period} 서울시 길단위인구 기반 추정치 · 실시간 보행자 수 아님`,
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
    <section className="evidence-coverage-summary" aria-label="선택 분기 원천자료 확인 상태">
      <div className="evidence-coverage-heading">
        <div>
          <span>선택 분기 원천자료</span>
          <strong>
            {items.length}개 중 {availableCount}개 확인
          </strong>
        </div>
        <small>{formatQuarterPeriod(analysis.period)} 기준</small>
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
          ? "세 원천자료가 있다는 뜻입니다. 운영 판단에 필요한 변화율·생존율·접근성 지표까지 모두 갖춰졌다는 뜻은 아니며, 아래 분석 근거 충족도와는 별도입니다."
          : `${missing.map((item) => item.label).join("·")} 자료가 없어 확인 가능한 원천자료 중심으로 분석했습니다. 아래 분석 근거 충족도는 더 낮아질 수 있습니다.`}
      </p>
    </section>
  );
}
