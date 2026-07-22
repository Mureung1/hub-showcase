import { useEffect, useState } from 'react';
import type { Category, CategoryStatus } from '../../types/analysis';
import type { FinancialRecord, FinancialSummary } from '../../types/financial';
import type { WeekdayPatternResponse, HourlyPatternResponse } from '../../types/pattern';
import type { Recommendation, RecommendationResponse } from '../../types/recommendation';
import { ANALYSIS_MOCK_DATA, CATEGORIES } from '../../constants/analysisMockData';
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

async function fetchWeekdayPattern(category: Category): Promise<WeekdayPatternResponse> {
  const res = await fetch(`/api/patterns/weekday?category=${encodeURIComponent(category)}`);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

async function fetchHourlyPattern(category: Category): Promise<HourlyPatternResponse> {
  const res = await fetch(`/api/patterns/hourly?category=${encodeURIComponent(category)}`);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

async function fetchRecommendations(): Promise<RecommendationResponse> {
  const res = await fetch('/api/recommendations');
  if (!res.ok) throw new Error(`Recommendation API Error: ${res.status}`);
  return res.json();
}

/** Rule Engine 결과를 Analysis 인사이트 상태로 매핑 — Dashboard의 risk 판정(SALES_DOWN_WASTE_UP·LOW_MARGIN)과 동일 기준 */
function statusFromRecommendations(categoryRecs: Recommendation[]): CategoryStatus {
  if (categoryRecs.some((r) => r.rule === 'SALES_UP_WASTE_LOW')) return 'opportunity';
  if (categoryRecs.some((r) => r.rule === 'SALES_DOWN_WASTE_UP' || r.rule === 'LOW_MARGIN')) return 'risk';
  return 'neutral';
}

function badgeFromStatus(status: CategoryStatus): '추천' | '주의' | undefined {
  if (status === 'opportunity') return '추천';
  if (status === 'risk') return '주의';
  return undefined;
}

function ruleReason(rec: Recommendation | undefined, fallback: string): string {
  if (!rec) return fallback;
  if (rec.rule === 'SALES_UP_WASTE_LOW') return `폐기율 ${rec.metrics.waste_rate.toFixed(1)}%로 안정적`;
  if (rec.rule === 'SALES_DOWN_WASTE_UP') return `폐기율 ${rec.metrics.waste_rate.toFixed(1)}%로 증가 추세`;
  return `마진율 ${rec.metrics.margin_rate.toFixed(1)}%로 평균 이하`;
}

function timeSuffix(hour: number): string {
  if (hour >= 6 && hour <= 10) return ' (아침)';
  if (hour >= 11 && hour <= 13) return ' (점심)';
  if (hour >= 14 && hour <= 17) return ' (오후)';
  if (hour >= 18 && hour <= 21) return ' (저녁)';
  return ' (심야)';
}

function bestIdxOf(values: number[]): number {
  return values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
}

/** 최고값 인덱스와 그보다 값이 큰 쪽 인접 인덱스, 오름차순 2개 — "구간" 요약용 */
function peakIdxsOf(values: number[]): number[] {
  const best = bestIdxOf(values);
  const prev = best - 1;
  const next = best + 1;
  const prevVal = prev >= 0 ? values[prev] : -Infinity;
  const nextVal = next < values.length ? values[next] : -Infinity;
  const neighbor = prevVal >= nextVal ? prev : next;
  if (neighbor < 0 || neighbor >= values.length) return [best];
  return [best, neighbor].sort((a, b) => a - b);
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

  const [weekdayPattern, setWeekdayPattern] = useState<WeekdayPatternResponse | null>(null);
  const [hourlyPattern, setHourlyPattern] = useState<HourlyPatternResponse | null>(null);
  const [patternError, setPatternError] = useState<string | null>(null);

  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchCategoryTrend(category)
      .then(setTrendRecords)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    Promise.all([fetchWeekdayPattern(category), fetchHourlyPattern(category)])
      .then(([weekday, hourly]) => {
        setWeekdayPattern(weekday);
        setHourlyPattern(hourly);
      })
      .catch((err) => setPatternError(err instanceof Error ? err.message : 'Unknown error'));
  }, [category]);

  // 카테고리에 무관하게 최신월 전체 추천 결과이므로 한 번만 로드
  useEffect(() => {
    fetchRecommendations()
      .then((res) => setRecommendations(res.data))
      .catch((err) => setRecError(err instanceof Error ? err.message : 'Unknown error'));
  }, []);

  const d = ANALYSIS_MOCK_DATA[category];

  const weekdayValues = weekdayPattern?.data.map((r) => r.avg_sales_amount) ?? [];
  const weekdayLabels = weekdayPattern?.data.map((r) => r.weekday) ?? [];
  const bestDayIdx = weekdayValues.length ? bestIdxOf(weekdayValues) : 0;

  const timeValues = hourlyPattern?.data.map((r) => r.avg_sales_amount) ?? [];
  const timeLabels = hourlyPattern?.data.map((r) => `${String(r.hour).padStart(2, '0')}시`) ?? [];
  const bestTimeIdx = timeValues.length ? bestIdxOf(timeValues) : 0;
  const peakIdxs = timeValues.length ? peakIdxsOf(timeValues) : [];

  const monthLabels = trendRecords.map((r) => `${r.month}월`);
  const salesWeekly = trendRecords.map((r) => Math.round(r.sales_amount / 1000));
  const wasteWeekly = trendRecords.map((r) => r.waste_rate);
  const salesQtyLabels = trendRecords.map((r) => `${r.sales_qty}개`);
  const wasteQtyLabels = trendRecords.map((r) => `${r.waste_qty}개`);

  const latest = trendRecords[trendRecords.length - 1];
  const prev = trendRecords[trendRecords.length - 2];
  const salesInfo = latest && prev ? trendLabelAndGood(latest.sales_amount, prev.sales_amount, false) : { label: d.salesTrend, good: d.salesGood };
  const wasteInfo = latest && prev ? trendLabelAndGood(latest.waste_rate, prev.waste_rate, true) : { label: d.wasteTrend, good: d.wasteGood };

  const categoryRecs = recommendations?.filter((r) => r.category === category) ?? [];
  const primaryRec =
    categoryRecs.find((r) => r.rule === 'SALES_UP_WASTE_LOW') ??
    categoryRecs.find((r) => r.rule === 'SALES_DOWN_WASTE_UP') ??
    categoryRecs.find((r) => r.rule === 'LOW_MARGIN');

  const insightReady = recommendations !== null && weekdayPattern !== null && hourlyPattern !== null;
  const insightStatus = statusFromRecommendations(categoryRecs);

  const tabBadges: Partial<Record<Category, '추천' | '주의'>> = {};
  if (recommendations !== null) {
    for (const c of CATEGORIES) {
      const badge = badgeFromStatus(statusFromRecommendations(recommendations.filter((r) => r.category === c)));
      if (badge) tabBadges[c] = badge;
    }
  }
  const insightReasons = insightReady
    ? [
        `${weekdayLabels[bestDayIdx]}요일 판매 집중`,
        `${timeLabels[bestTimeIdx]}${timeSuffix(hourlyPattern!.data[bestTimeIdx].hour)} 피크타임`,
        ruleReason(primaryRec, `폐기율 ${wasteInfo.label}`),
      ]
    : [];

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
      <CategoryTabs selectedCategory={category} onSelectCategory={setCategory} badges={tabBadges} />

      {/* Insight strip — /api/recommendations(Rule Engine) + 요일/시간대 패턴 실데이터 기반 */}
      {recError ? (
        <p style={{ color: '#DC2626', marginBottom: '20px' }}>인사이트를 불러오지 못했습니다: {recError}</p>
      ) : insightReady ? (
        <InsightStrip status={insightStatus} reasons={insightReasons} />
      ) : (
        <p style={{ color: '#475569', marginBottom: '20px' }}>AI 인사이트 로딩 중...</p>
      )}

      {/* Weekday / time-of-day patterns — data/master/weekday_sales.csv, hourly_sales.csv 실데이터 (6월 4주 평균) */}
      {patternError ? (
        <p style={{ color: '#DC2626', marginBottom: '20px' }}>패턴 데이터를 불러오지 못했습니다: {patternError}</p>
      ) : !weekdayPattern || !hourlyPattern ? (
        <p style={{ color: '#475569', marginBottom: '20px' }}>패턴 데이터 로딩 중...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <PatternBarChart
            title="요일별 판매 패턴"
            subtitle={`${category} · 최근 1개월 평균`}
            values={weekdayValues}
            labels={weekdayLabels}
            gap={12}
            bestPrefix="최고 판매 요일"
            bestLabel={`${weekdayLabels[bestDayIdx]}요일`}
            summary={weekdaySummary(weekdayValues, `${weekdayLabels[bestDayIdx]}요일`, bestDayIdx)}
          />
          <PatternBarChart
            title="시간대별 판매 패턴"
            subtitle={`${category} · 최근 1개월 평균`}
            values={timeValues}
            labels={timeLabels}
            gap={2}
            bestPrefix="최고 판매 시간대"
            bestLabel={timeLabels[bestTimeIdx] + timeSuffix(hourlyPattern.data[bestTimeIdx].hour)}
            summary={timeSummary(timeValues, timeLabels, peakIdxs)}
          />
        </div>
      )}

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
