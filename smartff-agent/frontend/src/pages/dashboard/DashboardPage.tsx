import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FinancialRecord, FinancialSummary } from '../../types/financial';
import type { Recommendation, RecommendationResponse } from '../../types/recommendation';
import AIBriefCard from '../../components/dashboard/AIBriefCard';
import RiskAlertCard from '../../components/dashboard/RiskAlertCard';
import KPICard from '../../components/dashboard/KPICard';
import SalesTrendChart from '../../components/dashboard/SalesTrendChart';
import MarginBarList from '../../components/dashboard/MarginBarList';
import type { MarginBarItem, WeeklyTrendPoint } from '../../types/dashboard';
import { eunNeun } from '../../utils/korean';

async function fetchSummary(): Promise<FinancialSummary> {
  const res = await fetch('/api/financial/summary');
  if (!res.ok) throw new Error(`Financial API Error: ${res.status}`);
  return res.json();
}

async function fetchRecommendations(): Promise<RecommendationResponse> {
  const res = await fetch('/api/recommendations');
  if (!res.ok) throw new Error(`Recommendation API Error: ${res.status}`);
  return res.json();
}

function sumBy(records: FinancialRecord[], key: 'sales_amount' | 'waste_amount' | 'margin_amount') {
  return records.reduce((sum, r) => sum + r[key], 0);
}

function buildMonthlyTrend(data: FinancialRecord[]): { points: WeeklyTrendPoint[]; totalLabel: string; bestMonth: string } {
  const months = [...new Set(data.map((r) => r.month))].sort((a, b) => a - b);

  const points: WeeklyTrendPoint[] = months.map((month) => {
    const amount = Math.round(sumBy(data.filter((r) => r.month === month), 'sales_amount') / 1000);
    const label = `${month}월`;
    return { label, amount, tooltip: `${label} · 매출 ${amount.toLocaleString()}천원` };
  });

  const total = points.reduce((sum, p) => sum + p.amount, 0);
  const best = points.reduce((max, p) => (p.amount > max.amount ? p : max), points[0]);

  return {
    points,
    totalLabel: `${total.toLocaleString()}천원`,
    bestMonth: best?.label ?? '',
  };
}

function buildMarginBars(
  currentRecords: FinancialRecord[],
  prevRecords: FinancialRecord[],
  recommendations: Recommendation[]
): MarginBarItem[] {
  const maxRate = Math.max(...currentRecords.map((r) => r.margin_rate));

  return [...currentRecords]
    .sort((a, b) => b.margin_rate - a.margin_rate)
    .map((r) => {
      const prev = prevRecords.find((p) => p.category === r.category);
      const delta = prev ? r.margin_rate - prev.margin_rate : null;
      const rec = recommendations.find((rec) => rec.category === r.category);

      return {
        name: r.category,
        rate: Math.round(r.margin_rate),
        delta: delta === null ? '전월 데이터 없음' : `전월 대비 ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%p`,
        deltaGood: delta === null ? true : delta >= 0,
        isTop: r.margin_rate === maxRate,
        isAiPick: rec?.rule === 'SALES_UP_WASTE_LOW',
        isRisk: rec?.rule === 'SALES_DOWN_WASTE_UP' || rec?.rule === 'LOW_MARGIN',
      };
    });
}

function buildBrief(
  recommendations: Recommendation[],
  marginBars: MarginBarItem[],
  overallMarginRate: number
) {
  const rec = recommendations.find((r) => r.rule === 'SALES_UP_WASTE_LOW');

  if (rec) {
    return {
      titleHighlight: rec.category,
      titleRest: ` ${rec.title}`,
      reasons: [
        `판매량 ${rec.metrics.sales_qty_prev}개 → ${rec.metrics.sales_qty}개로 증가`,
        `폐기율 ${rec.metrics.waste_rate.toFixed(1)}% (카테고리 평균 ${rec.metrics.category_avg_waste_rate.toFixed(1)}% 이하)`,
        `순이익 ${rec.metrics.net_income_prev.toLocaleString()}원 → ${rec.metrics.net_income.toLocaleString()}원으로 증가`,
      ],
      ctaLabel: '확인 완료로 표시',
      linkCategory: null, // 추천 확인(승인) 액션 — 아직 상태 저장 기능 없어 비활성
    };
  }

  const top = marginBars[0];
  const topName = top?.name ?? '전체';
  return {
    titleHighlight: topName,
    titleRest: `${eunNeun(topName)} 마진율 기준 가장 안정적으로 운영되고 있습니다`,
    reasons: [
      `최근 1개월 마진율 ${top?.rate ?? 0}%로 전체 카테고리 중 가장 높음`,
      `전체 평균 마진율 ${overallMarginRate.toFixed(0)}%`,
      '이번 달 발주 확대가 필요한 카테고리는 없습니다',
    ],
    ctaLabel: '재무 페이지에서 자세히 보기',
    linkCategory: top?.name ?? null,
  };
}

function buildRisk(recommendations: Recommendation[]) {
  const rec =
    recommendations.find((r) => r.rule === 'SALES_DOWN_WASTE_UP') ??
    recommendations.find((r) => r.rule === 'LOW_MARGIN');

  if (!rec) return null;

  const reasons =
    rec.rule === 'SALES_DOWN_WASTE_UP'
      ? [
          `판매량 ${rec.metrics.sales_qty_prev}개 → ${rec.metrics.sales_qty}개로 감소`,
          `폐기율 ${rec.metrics.waste_rate_prev.toFixed(1)}% → ${rec.metrics.waste_rate.toFixed(1)}%로 증가`,
          `순이익 ${rec.metrics.net_income_prev.toLocaleString()}원 → ${rec.metrics.net_income.toLocaleString()}원으로 감소`,
        ]
      : [
          `마진율 ${rec.metrics.margin_rate.toFixed(1)}%로 전체 평균(${rec.metrics.overall_avg_margin_rate.toFixed(1)}%) 이하`,
          `순이익 ${rec.metrics.net_income.toLocaleString()}원`,
          '수익성 점검이 필요합니다',
        ];

  return {
    title: `${rec.category}\n${rec.title}`,
    reasons,
    ctaLabel: `${rec.category} 상세 보기 →`,
    linkCategory: rec.category,
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchSummary(), fetchRecommendations()])
      .then(([summaryData, recData]) => {
        setSummary(summaryData);
        setRecommendations(recData.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '48px', minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#475569' }}>데이터 로딩 중...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div style={{ padding: '48px', minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#DC2626' }}>오류: {error || 'No data'}</p>
      </div>
    );
  }

  const latestMonth = Math.max(...summary.data.map((r) => r.month));
  const prevMonth = latestMonth - 1;
  const currentRecords = summary.data.filter((r) => r.month === latestMonth);
  const prevRecords = summary.data.filter((r) => r.month === prevMonth);
  const currentRecs = recommendations.filter((r) => r.month === latestMonth);

  const totalSales = sumBy(currentRecords, 'sales_amount');
  const prevTotalSales = sumBy(prevRecords, 'sales_amount');
  const salesTrendPct = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;

  const totalWaste = sumBy(currentRecords, 'waste_amount');
  const overallWasteRate = totalSales > 0 ? (totalWaste / totalSales) * 100 : 0;

  const totalMargin = sumBy(currentRecords, 'margin_amount');
  const overallMarginRate = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0;

  const { points, totalLabel, bestMonth } = buildMonthlyTrend(summary.data);
  const marginBars = buildMarginBars(currentRecords, prevRecords, currentRecs);
  const brief = buildBrief(currentRecs, marginBars, overallMarginRate);
  const risk = buildRisk(currentRecs);

  const goToFinancial = (category?: string | null) => {
    navigate(category ? `/financial?category=${encodeURIComponent(category)}` : '/financial');
  };

  return (
    <div style={{ padding: '36px 48px 56px', minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>대시보드</h1>
          <p style={{ fontSize: '13px', color: '#475569', margin: '0' }}>
            <span style={{ color: '#15803D', fontWeight: '600', marginRight: '4px' }}>●</span>
            GS25 강남역점 · {latestMonth}월 기준 분석 완료
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

      {/* Hero: AI 제안 + 위험 신호 + KPI */}
      <div style={{ padding: '8px 0 30px', borderBottom: '1px solid #E2E8F0', marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: risk ? '2fr 1fr' : '1fr', gap: '20px', marginBottom: '22px', alignItems: 'stretch' }}>
          <AIBriefCard
            titleHighlight={brief.titleHighlight}
            titleRest={brief.titleRest}
            reasons={brief.reasons}
            ctaLabel={brief.ctaLabel}
            onCtaClick={brief.linkCategory ? () => goToFinancial(brief.linkCategory) : undefined}
          />
          {risk && (
            <RiskAlertCard
              title={risk.title}
              reasons={risk.reasons}
              ctaLabel={risk.ctaLabel}
              onCtaClick={() => goToFinancial(risk.linkCategory)}
            />
          )}
        </div>

        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '16px' }}>
          핵심 지표 · 확정 데이터
        </div>
        <KPICard
          salesTrend={`${salesTrendPct >= 0 ? '+' : ''}${salesTrendPct.toFixed(0)}`}
          salesNote={`최근 1개월 기준 · ${salesTrendPct >= 0 ? '상승세' : '하락세'}`}
          wasteRate={overallWasteRate.toFixed(1)}
          wasteNote={`최근 1개월 기준 · ${overallWasteRate < 15 ? '안정적' : '주의 필요'}`}
          marginRate={overallMarginRate.toFixed(0)}
          marginNote={`최근 1개월 기준 · ${overallMarginRate >= 30 ? '고수익' : '보통'}`}
        />
      </div>

      {/* Bento: 판매 추세 차트 + 카테고리별 마진율 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <SalesTrendChart title="최근 6개월 판매 추세" totalLabel={totalLabel} points={points} bestWeek={bestMonth} bestWeekLabel="최고 판매 월" />
        <MarginBarList items={marginBars} onViewAllClick={() => goToFinancial()} />
      </div>

      {/* Footer strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px' }}>
        <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: '600' }}>
          데이터 기준일 · 판매·폐기 {summary.period.start} ~ {summary.period.end}
        </div>
      </div>
    </div>
  );
}
