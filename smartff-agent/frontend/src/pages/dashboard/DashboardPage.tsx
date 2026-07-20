import { DASHBOARD_MOCK_DATA } from '../../constants/dashboardMockData';
import AIBriefCard from '../../components/dashboard/AIBriefCard';
import RiskAlertCard from '../../components/dashboard/RiskAlertCard';
import KPICard from '../../components/dashboard/KPICard';
import SalesTrendChart from '../../components/dashboard/SalesTrendChart';
import MarginBarList from '../../components/dashboard/MarginBarList';

export default function DashboardPage() {
  const d = DASHBOARD_MOCK_DATA;

  return (
    <div style={{ padding: '36px 48px 56px', minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>대시보드</h1>
          <p style={{ fontSize: '13px', color: '#475569', margin: '0' }}>
            <span style={{ color: '#15803D', fontWeight: '600', marginRight: '4px' }}>●</span>
            {d.storeName} · {d.storeStatus}
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

      {/* Hero: AI 제안 + 위험 신호 + KPI */}
      <div style={{ padding: '8px 0 30px', borderBottom: '1px solid #E2E8F0', marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '22px', alignItems: 'stretch' }}>
          <AIBriefCard
            titleHighlight={d.brief.titleHighlight}
            titleRest={d.brief.titleRest}
            reasons={d.brief.reasons}
            ctaLabel={d.brief.ctaLabel}
          />
          <RiskAlertCard title={d.risk.title} reasons={d.risk.reasons} ctaLabel={d.risk.ctaLabel} />
        </div>

        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '16px' }}>
          핵심 지표 · 확정 데이터
        </div>
        <KPICard
          salesTrend={d.kpis.salesTrend}
          salesNote={d.kpis.salesNote}
          wasteRate={d.kpis.wasteRate}
          wasteNote={d.kpis.wasteNote}
          marginRate={d.kpis.marginRate}
          marginNote={d.kpis.marginNote}
        />
      </div>

      {/* Bento: 판매 추세 차트 + 카테고리별 마진율 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <SalesTrendChart totalLabel={d.weeklyTrend.totalLabel} points={d.weeklyTrend.points} bestWeek={d.weeklyTrend.bestWeek} />
        <MarginBarList items={d.marginBars} />
      </div>

      {/* Footer strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px' }}>
        <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: '600' }}>데이터 기준일 · 판매·발주·폐기 2026.07.08</div>
      </div>
    </div>
  );
}
