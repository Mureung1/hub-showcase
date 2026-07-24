import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FinancialSummary } from '../../types/financial';
import FinancialKPICard from '../../components/financial/FinancialKPICard';
import InfoBox from '../../components/financial/InfoBox';
import ProfitContribution from '../../components/financial/ProfitContribution';
import MarginWasteChart from '../../components/financial/MarginWasteChart';
import WasteLossRanking from '../../components/financial/WasteLossRanking';
import MonthSelector from '../../components/financial/MonthSelector';
import CategorySelector, { CATEGORIES } from '../../components/financial/CategorySelector';
import ProfitStructure from '../../components/financial/ProfitStructure';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function calcDelta(current: number, prev: number | undefined, goodWhenUp: boolean) {
  if (prev === undefined || prev === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  return { pct, goodWhenUp };
}

async function fetchSummary(months: number, category: string): Promise<FinancialSummary> {
  const params = new URLSearchParams({ months: String(months) });
  if (category !== '전체') {
    params.set('categories', category);
  }
  const res = await fetch(`${API_BASE_URL}/api/financial/summary?${params}`);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}

export default function FinancialPage() {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const initialCategory = categoryFromUrl && CATEGORIES.includes(categoryFromUrl) ? categoryFromUrl : '전체';

  const [selectedMonth, setSelectedMonth] = useState(6);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<FinancialSummary | null>(null);
  const [fullSummary, setFullSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryData, prevData] = await Promise.all([
          fetchSummary(selectedMonth, selectedCategory),
          selectedMonth > 1 ? fetchSummary(selectedMonth - 1, selectedCategory) : Promise.resolve(null),
        ]);
        setSummary(summaryData);
        setPrevSummary(prevData);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedCategory]);

  // AI 재무 인사이트는 카테고리 필터와 무관하게 항상 전체 카테고리 기준으로 랭킹을 계산
  useEffect(() => {
    fetchSummary(selectedMonth, '전체')
      .then(setFullSummary)
      .catch(() => setFullSummary(null));
  }, [selectedMonth]);

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

  const totalMargin = summary.data.reduce((sum, r) => sum + r.margin_amount, 0);
  const prevTotalMargin = prevSummary?.data.reduce((sum, r) => sum + r.margin_amount, 0);
  const showRankings = selectedCategory === '전체';

  const costAmount = summary.summary.total_sales - totalMargin;
  const costRate = summary.summary.total_sales > 0 ? (costAmount / summary.summary.total_sales) * 100 : 0;

  const salesDelta = calcDelta(summary.summary.total_sales, prevSummary?.summary.total_sales, true);
  const marginDelta = calcDelta(totalMargin, prevTotalMargin, true);
  const wasteDelta = calcDelta(summary.summary.total_waste, prevSummary?.summary.total_waste, false);
  const netIncomeDelta = calcDelta(summary.summary.total_net_income, prevSummary?.summary.total_net_income, true);

  return (
    <div style={{ padding: '36px 48px 56px', minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>재무</h1>
          <p style={{ fontSize: '13px', color: '#475569', margin: '0' }}>
            <span style={{ color: '#15803D', fontWeight: '600', marginRight: '4px' }}>●</span>
            GS25 강남역점 · 관리회계 기준 수익성 분석
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

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
        <CategorySelector selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        <MonthSelector selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
      </div>

      {/* AI Financial Insight — 항상 전체 카테고리 데이터 기준 */}
      {fullSummary && <InfoBox data={fullSummary.data} selectedCategory={selectedCategory} />}

      {/* KPI 4-Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <FinancialKPICard label="총매출" value={summary.summary.total_sales} note={`${selectedMonth}월 기준`} delta={salesDelta} />
        <FinancialKPICard label="마진액" value={totalMargin} note="매출 − 매출원가" delta={marginDelta} />
        <FinancialKPICard
          label="폐기손실"
          value={summary.summary.total_waste}
          note={`${selectedMonth}월 폐기금액`}
          color="danger"
          delta={wasteDelta}
        />
        <FinancialKPICard
          label="추정 순이익"
          value={summary.summary.total_net_income}
          note={`순이익률 ${summary.summary.avg_net_rate.toFixed(0)}% · 마진액 − 폐기손실`}
          color="highlight"
          delta={netIncomeDelta}
        />
      </div>

      {/* Profit Structure (P&L breakdown) */}
      <ProfitStructure
        totalSales={summary.summary.total_sales}
        costAmount={costAmount}
        costRate={costRate}
        totalMargin={totalMargin}
        marginRate={summary.summary.avg_margin_rate}
        totalWaste={summary.summary.total_waste}
        wasteRate={summary.summary.avg_waste_rate}
        netIncome={summary.summary.total_net_income}
        netRate={summary.summary.avg_net_rate}
      />

      {/* Profit Contribution (only meaningful across multiple categories) */}
      {showRankings && <ProfitContribution data={summary.data} />}

      {/* Margin vs Waste Chart */}
      <div style={{ marginBottom: '20px' }}>
        <MarginWasteChart data={summary.data} />
      </div>

      {/* Waste Loss Ranking + Waste Rate (only meaningful across multiple categories) */}
      {showRankings && <WasteLossRanking data={summary.data} totalWaste={summary.summary.total_waste} />}

      {/* Footer strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '20px' }}>
        <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: '600' }}>
          데이터 기준일 · 판매·폐기 {summary.period.start} ~ {summary.period.end}
        </div>
      </div>
    </div>
  );
}
