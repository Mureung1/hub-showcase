import { useEffect, useState } from 'react';
import FinancialKPICard from '../../components/financial/FinancialKPICard';
import MarginWasteChart from '../../components/financial/MarginWasteChart';
import WasteLossRanking from '../../components/financial/WasteLossRanking';
import CategoryGuide from '../../components/financial/CategoryGuide';
import InfoBox from '../../components/financial/InfoBox';

export default function FinancialPage() {
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const summaryRes = await fetch('/api/financial/summary');
        if (!summaryRes.ok) {
          throw new Error(`API Error: ${summaryRes.status}`);
        }
        const summaryData = await summaryRes.json();
        setSummary(summaryData);

        const categoryRes = await fetch('/api/financial/category');
        if (!categoryRes.ok) throw new Error(`Failed to fetch categories`);
        const categoryData = await categoryRes.json();
        setCategories(categoryData.data);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  const totalMargin = summary.data.reduce((sum: number, r: any) => sum + r.margin_amount, 0);
  const avgMarginRate = summary.summary.avg_margin_rate;

  return (
    <div style={{ padding: '48px', minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>재무</h1>
        <p style={{ fontSize: '12px', color: '#64748B', margin: '0' }}>
          {summary.period.start} ~ {summary.period.end} · 실제 데이터
        </p>
      </div>

      {/* Info Box */}
      <InfoBox
        marginRate={avgMarginRate}
        marginAmount={totalMargin}
        totalSales={summary.summary.total_sales}
      />

      {/* KPI 4-Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <FinancialKPICard
          label="총매출"
          value={summary.summary.total_sales}
          format="currency"
          color="primary"
        />
        <FinancialKPICard
          label="마진액"
          value={totalMargin}
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

      {/* Category Guide */}
      <CategoryGuide data={summary.data} />

      {/* Margin vs Waste Chart */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '12px' }}>
          카테고리별 비교
        </div>
        <MarginWasteChart data={summary.data} categories={categories} />
      </div>

      {/* Waste Loss Ranking */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '12px' }}>
          손실 분석
        </div>
        <WasteLossRanking data={summary.data} totalWaste={summary.summary.total_waste} />
      </div>
    </div>
  );
}
