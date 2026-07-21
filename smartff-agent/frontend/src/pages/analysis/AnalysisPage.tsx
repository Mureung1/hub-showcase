import { useEffect, useState } from 'react';
import type { Category } from '../../types/analysis';
import type { FinancialRecord, FinancialSummary } from '../../types/financial';
import { ANALYSIS_MOCK_DATA } from '../../constants/analysisMockData';
import { weekdaySummary, timeSummary, monthlyTrendSummary } from '../../utils/analysisSummary';
import CategoryTabs from '../../components/analysis/CategoryTabs';
import InsightStrip from '../../components/analysis/InsightStrip';
import PatternBarChart from '../../components/analysis/PatternBarChart';
import TrendLineChart from '../../components/analysis/TrendLineChart';

async function fetchCategoryTrend(category: Category): Promise<FinancialRecord[]> {
  const res = await fetch(`/api/financial/summary?categories=${encodeURIComponent(category)}`);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const data: FinancialSummary = await res.json();
  return [...data.data].sort((a, b) => a.month - b.month);
}

function trendLabelAndGood(latest: number, prev: number, isWaste: boolean) {
  const diff = latest - prev;

  if (isWaste) {
    if (diff < 0) return { label: '안정적', good: true as boolean | null };
    if (diff > Math.abs(prev) * 0.1) return { label: '지속 증가', good: false as boolean | null };
    return { label: '보통', good: null as boolean | null };
  }

  const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 0;
  return { label: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`, good: pct >= 0 };
}

export default function AnalysisPage() {
  const [category, setCategory] = useState<Category>('도시락');
  const [trendRecords, setTrendRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchCategoryTrend(category)
      .then(setTrendRecords)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [category]);

  const d = ANALYSIS_MOCK_DATA[category];

  const monthLabels = trendRecords.map((r) => `${r.month}월`);
  const salesWeekly = trendRecords.map((r) => Math.round(r.sales_amount / 1000));
  const wasteWeekly = trendRecords.map((r) => r.waste_rate);
  const salesQtyLabels = trendRecords.map((r) => `${r.sales_qty}개`);
  const wasteQtyLabels = trendRecords.map((r) => `${r.waste_qty}개`);

  const latest = trendRecords[trendRecords.length - 1];
  const prev = trendRecords[trendRecords.length - 2];
  const salesInfo = latest && prev ? trendLabelAndGood(latest.sales_amount, prev.sales_amount, false) : { label: d.salesTrend, good: d.salesGood };
  const wasteInfo = latest && prev ? trendLabelAndGood(latest.waste_rate, prev.waste_rate, true) : { label: d.wasteTrend, good: d.wasteGood };

  return (
    <div style={{ padding: '36px 48px 56px', minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>분석</h1>
            <p style={{ fontSize: '13px', color: '#475569', margin: '0' }}>
              <span style={{ color: '#15803D', fontWeight: '600', marginRight: '4px' }}>●</span>
              GS25 강남역점 · 판매 패턴 분석
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
            <div
              style={{
                fontSize: '12.5px',
                color: '#475569',
                padding: '7px 14px',
                background: '#F1F5F9',
                borderRadius: '20px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* Category selector */}
      <CategoryTabs selectedCategory={category} onSelectCategory={setCategory} />

      {/* Insight strip */}
      <InsightStrip status={d.type} reasons={d.reasons} />

      {/* Weekday / time-of-day patterns — 원본 데이터에 요일·시간대 정보가 없어 목업 유지 (내일 연동 예정) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <PatternBarChart
          title="요일별 판매 패턴"
          subtitle={`${category} · 최근 1개월 평균`}
          values={d.weekday}
          labels={d.weekdayLabels}
          gap={12}
          bestPrefix="최고 판매 요일"
          bestLabel={d.bestDay}
          summary={weekdaySummary(d.weekday, d.bestDay, d.bestDayIdx)}
        />
        <PatternBarChart
          title="시간대별 판매 패턴"
          subtitle={`${category} · 최근 1개월 평균`}
          values={d.time}
          labels={d.timeLabels}
          gap={8}
          bestPrefix="최고 판매 시간대"
          bestLabel={d.timeLabels[d.bestTimeIdx] + d.bestTimeSuffix}
          summary={timeSummary(d.time, d.timeLabels, d.peakIdxs)}
        />
      </div>

      {/* Sales / waste trends — 실데이터(merged_dataset.csv, 월별) 연동 */}
      {error ? (
        <p style={{ color: '#DC2626', marginBottom: '20px' }}>추세 데이터를 불러오지 못했습니다: {error}</p>
      ) : loading ? (
        <p style={{ color: '#475569', marginBottom: '20px' }}>추세 데이터 로딩 중...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <TrendLineChart
            title={`판매 추세 (${category})`}
            periodLabel={`최근 ${monthLabels.length}개월`}
            trendLabel={salesInfo.label}
            good={salesInfo.good}
            values={salesWeekly}
            xLabels={monthLabels}
            pointLabels={salesQtyLabels}
            summary={monthlyTrendSummary(salesWeekly, false)}
            goodColor="#2563EB"
            gradientId="salesFill"
            gradientOpacity={0.16}
            strokeWidth={3}
          />
          <TrendLineChart
            title={`폐기 추세 (${category})`}
            periodLabel={`최근 ${monthLabels.length}개월`}
            trendLabel={wasteInfo.label}
            good={wasteInfo.good}
            values={wasteWeekly}
            xLabels={monthLabels}
            pointLabels={wasteQtyLabels}
            summary={monthlyTrendSummary(wasteWeekly, true)}
            goodColor="#15803D"
            gradientId="wasteFill"
            gradientOpacity={0.12}
            strokeWidth={3.5}
          />
        </div>
      )}

      {/* Footer strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px' }}>
        <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: '600' }}>데이터 기준일 · 판매·발주·폐기 2026.07.08</div>
      </div>
    </div>
  );
}
