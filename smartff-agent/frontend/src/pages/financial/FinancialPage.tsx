import { useEffect, useState } from 'react';
import { FinancialSummary, CategorySummary } from '../../types/financial';
import FinancialKPICard from '../../components/financial/FinancialKPICard';
import MarginWasteChart from '../../components/financial/MarginWasteChart';
import WasteLossRanking from '../../components/financial/WasteLossRanking';

export default function FinancialPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const summaryRes = await fetch('/api/financial/summary');
        if (!summaryRes.ok) throw new Error('Failed to fetch summary');
        const summaryData = await summaryRes.json();
        setSummary(summaryData);

        const categoryRes = await fetch('/api/financial/category');
        if (!categoryRes.ok) throw new Error('Failed to fetch categories');
        const categoryData = await categoryRes.json();
        setCategories(categoryData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '36px 48px', minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#475569' }}>데이터 로딩 중...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div style={{ padding: '36px 48px', minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#DC2626' }}>오류: {error || 'No data'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 48px 56px', minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>재무</h1>
        <p style={{ fontSize: '13px', color: '#475569', margin: '0' }}>
          {summary.period.start} ~ {summary.period.end} · 실제 데이터
        </p>
      </div>

      {/* KPI 4-Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <FinancialKPICard
          label="총매출"
          value={summary.summary.total_sales}
          format="currency"
          color="primary"
        />
        <FinancialKPICard
          label="마진액"
          value={summary.data.reduce((sum, r) => sum + r.margin_amount, 0)}
          format="currency"
          color="primary"
        />
        <FinancialKPICard
          label="폐기손실"
          value={summary.summary.total_waste}
          format="currency"
          color="danger"
        />
        <FinancialKPICard
          label="순이익"
          value={summary.summary.total_net_income}
          format="currency"
          color="success"
        />
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <FinancialKPICard
          label="평균 마진율"
          value={summary.summary.avg_margin_rate}
          format="percent"
          color="primary"
        />
        <FinancialKPICard
          label="평균 폐기율"
          value={summary.summary.avg_waste_rate}
          format="percent"
          color="warning"
        />
        <FinancialKPICard
          label="평균 순이익율"
          value={summary.summary.avg_net_rate}
          format="percent"
          color="success"
        />
      </div>

      {/* Margin vs Waste Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '16px' }}>
          카테고리별 비교
        </div>
        <MarginWasteChart data={summary.data} categories={categories} />
      </div>

      {/* Waste Loss Ranking */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '16px' }}>
          손실 분석
        </div>
        <WasteLossRanking data={summary.data} totalWaste={summary.summary.total_waste} />
      </div>
    </div>
  );
}
