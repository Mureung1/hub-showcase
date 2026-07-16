import { DASHBOARD_MOCK_DATA } from '../../constants/dashboardMockData';
import { trendSummary } from '../../utils/analysisSummary';
import AIBriefCard from '../../components/dashboard/AIBriefCard';
import KPICard from '../../components/dashboard/KPICard';
import TrendLineChart from '../../components/analysis/TrendLineChart';

export default function DashboardPage() {
  const d = DASHBOARD_MOCK_DATA;

  return (
    <div style={{ padding: '36px 48px 56px', minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>대시보드</div>
            <p style={{ fontSize: '13px', color: '#475569', margin: '0' }}>
              <span style={{ color: '#15803D', fontWeight: '600', marginRight: '4px' }}>●</span>
              {d.storeName} · {d.storeStatus}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span
              style={{
                padding: '5px 10px',
                background: '#EFF6FF',
                color: '#2563EB',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '9999px',
              }}
            >
              AI 분석 완료 · 98% 반영
            </span>
            <span
              style={{
                padding: '5px 10px',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0',
              }}
            >
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
          </div>
        </div>
      </div>

      {/* AI Brief Card */}
      <AIBriefCard title={d.briefTitle} reasons={d.briefReasons} ctaLabel={d.briefCta} />

      {/* KPI Cards */}
      <KPICard sales={d.kpiSales} wasteRate={d.kpiWasteRate} marginRate={d.kpiMarginRate} />

      {/* Trend Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
        <TrendLineChart
          title="판매 추세 (최근 12주)"
          trendLabel={d.kpiSales}
          good={true}
          values={d.salesWeekly}
          xLabels={['12주 전', '8주 전', '4주 전', '이번 주']}
          summary={trendSummary(d.salesWeekly, false)}
          goodColor="#2563EB"
          gradientId="salesFill"
          gradientOpacity={0.16}
          strokeWidth={3}
        />
        <TrendLineChart
          title="폐기 추세 (최근 12주)"
          trendLabel="안정적"
          good={true}
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
