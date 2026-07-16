import { useState } from 'react';
import type { Category } from '../../types/analysis';
import { ANALYSIS_MOCK_DATA } from '../../constants/analysisMockData';
import { weekdaySummary, timeSummary, trendSummary } from '../../utils/analysisSummary';
import CategoryTabs from '../../components/analysis/CategoryTabs';
import InsightStrip from '../../components/analysis/InsightStrip';
import PatternBarChart from '../../components/analysis/PatternBarChart';
import TrendLineChart from '../../components/analysis/TrendLineChart';

export default function AnalysisPage() {
  const [category, setCategory] = useState<Category>('도시락');
  const d = ANALYSIS_MOCK_DATA[category];

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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#1D4ED8',
                padding: '7px 14px',
                background: '#EFF6FF',
                borderRadius: '20px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
              AI 분석 높음 · 98% 반영
            </div>
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

      {/* Weekday / time-of-day patterns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <PatternBarChart
          title="요일별 판매 패턴"
          subtitle={`${category} · 최근 4주 평균`}
          values={d.weekday}
          labels={d.weekdayLabels}
          gap={12}
          bestPrefix="최고 판매 요일"
          bestLabel={d.bestDay}
          summary={weekdaySummary(d.weekday, d.bestDay, d.bestDayIdx)}
        />
        <PatternBarChart
          title="시간대별 판매 패턴"
          subtitle={`${category} · 최근 4주 평균`}
          values={d.time}
          labels={d.timeLabels}
          gap={8}
          bestPrefix="최고 판매 시간대"
          bestLabel={d.timeLabels[d.bestTimeIdx] + d.bestTimeSuffix}
          summary={timeSummary(d.time, d.timeLabels, d.peakIdxs)}
        />
      </div>

      {/* Sales / waste trends */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <TrendLineChart
          title="판매 추세 (최근 12주)"
          trendLabel={d.salesTrend}
          good={d.salesGood}
          values={d.salesWeekly}
          xLabels={['12주 전', '8주 전', '4주 전', '이번 주']}
          summary={trendSummary(d.salesWeekly, false)}
          goodColor="#2563EB"
          gradientId="salesFill"
          gradientOpacity={0.16}
          strokeWidth={3}
        />
        <TrendLineChart
          title="폐기 추세"
          trendLabel={d.wasteTrend}
          good={d.wasteGood}
          values={d.wasteWeekly}
          xLabels={['12주 전', '8주 전', '4주 전', '이번 주']}
          summary={trendSummary(d.wasteWeekly, true)}
          goodColor="#15803D"
          gradientId="wasteFill"
          gradientOpacity={0.12}
          strokeWidth={3.5}
        />
      </div>

      {/* Footer strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px' }}>
        <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: '600' }}>데이터 기준일 · 판매·발주·폐기 2026.07.08</div>
      </div>
    </div>
  );
}
