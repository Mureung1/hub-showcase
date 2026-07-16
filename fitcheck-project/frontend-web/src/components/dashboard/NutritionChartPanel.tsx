import { useMemo } from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import {
  getCalorieTrendData,
  getMacroShareData,
  getNutritionSummary,
  type NutritionPeriod,
} from '../../utils/nutrition';
import './NutritionChartPanel.css';

interface NutritionChartPanelProps {
  period: NutritionPeriod;
  onPeriodChange: (period: NutritionPeriod) => void;
}

const CHART_COLORS = {
  actual: '#e50914',
  goal: '#8b93a7',
  grid: '#2e3448',
  text: '#999999',
  tooltipBg: '#1e2230',
};

function CalorieTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="nutrition-chart-tooltip">
      <p className="nutrition-chart-tooltip-label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value.toLocaleString()}</strong> kcal
        </p>
      ))}
    </div>
  );
}

function MacroTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { grams: number; color: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]!;
  return (
    <div className="nutrition-chart-tooltip">
      <p className="nutrition-chart-tooltip-label">{entry.name}</p>
      <p style={{ color: entry.payload.color }}>
        <strong>{entry.payload.grams.toLocaleString()}g</strong>
      </p>
    </div>
  );
}

export default function NutritionChartPanel({
  period,
  onPeriodChange,
}: NutritionChartPanelProps) {
  const { members, data, selectedMemberId, setSelectedMemberId } = useAppStore();

  const selectedMember =
    members.find((member) => member.id === selectedMemberId) ?? members[0];

  const calorieTrend = useMemo(() => {
    if (!selectedMember) return [];
    return getCalorieTrendData(data.meals, selectedMember, period);
  }, [data.meals, selectedMember, period]);

  const macroShare = useMemo(() => {
    if (!selectedMember) return [];
    return getMacroShareData(data.meals, selectedMember.id, period);
  }, [data.meals, selectedMember, period]);

  const summary = useMemo(() => {
    if (!selectedMember) {
      return { loggedDays: 0, avgActual: 0, goal: 0, goalDiff: 0 };
    }
    return getNutritionSummary(data.meals, selectedMember, period);
  }, [data.meals, selectedMember, period]);

  if (!selectedMember) return null;

  const periodLabel = period === 7 ? '최근 7일' : '최근 30일';
  const goalDiffLabel =
    summary.goalDiff === 0
      ? '목표와 동일'
      : summary.goalDiff > 0
        ? `목표 대비 +${summary.goalDiff.toLocaleString()} kcal`
        : `목표 대비 ${summary.goalDiff.toLocaleString()} kcal`;

  return (
    <section className="panel nutrition-panel">
      <div className="panel-header nutrition-panel-header">
        <div>
          <h2>
            <span className="panel-icon">
              <PieChartIcon size={14} />
            </span>
            영양 섭취 시각화
          </h2>
          <p>
            {periodLabel} 기준 · 목표 칼로리 대비 섭취량과 탄단지 비율을 확인하세요
          </p>
        </div>

        <div className="nutrition-controls">
          <label className="nutrition-member-select">
            <span>회원</span>
            <select
              value={selectedMember.id}
              onChange={(event) => setSelectedMemberId(event.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <div className="nutrition-period-toggle" role="group" aria-label="기간 선택">
            <button
              type="button"
              className={period === 7 ? 'is-active' : ''}
              onClick={() => onPeriodChange(7)}
            >
              7일
            </button>
            <button
              type="button"
              className={period === 30 ? 'is-active' : ''}
              onClick={() => onPeriodChange(30)}
            >
              30일
            </button>
          </div>
        </div>
      </div>

      <div className="nutrition-summary">
        <div className="nutrition-summary-item">
          <span>기록 일수</span>
          <strong>
            {summary.loggedDays}
            <small> / {period}일</small>
          </strong>
        </div>
        <div className="nutrition-summary-item">
          <span>평균 섭취</span>
          <strong>
            {summary.avgActual.toLocaleString()}
            <small> kcal</small>
          </strong>
        </div>
        <div className="nutrition-summary-item">
          <span>목표 칼로리</span>
          <strong>
            {summary.goal.toLocaleString()}
            <small> kcal</small>
          </strong>
        </div>
        <div className="nutrition-summary-item">
          <span>평균 차이</span>
          <strong className={summary.goalDiff < 0 ? 'is-low' : summary.goalDiff > 0 ? 'is-high' : ''}>
            {goalDiffLabel}
          </strong>
        </div>
      </div>

      <div className="nutrition-charts">
        <div className="nutrition-chart-card">
          <div className="nutrition-chart-card-header">
            <h3>목표 칼로리 vs 실제 섭취</h3>
            <p>{periodLabel} 일별 추이</p>
          </div>
          <div className="nutrition-chart-body nutrition-line-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={calorieTrend}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  interval={period === 30 ? 3 : 0}
                  minTickGap={8}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  width={48}
                  tickFormatter={(value: number) => `${Math.round(value / 100) / 10}k`}
                />
                <Tooltip content={<CalorieTooltip />} />
                <Legend
                  wrapperStyle={{ color: CHART_COLORS.text, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="goal"
                  name="목표 칼로리"
                  stroke={CHART_COLORS.goal}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="실제 섭취"
                  stroke={CHART_COLORS.actual}
                  strokeWidth={2.5}
                  dot={{ r: period === 7 ? 3.5 : 2, fill: CHART_COLORS.actual }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="nutrition-chart-card">
          <div className="nutrition-chart-card-header">
            <h3>탄단지 섭취 비율</h3>
            <p>{periodLabel} 합산 기준</p>
          </div>
          <div className="nutrition-chart-body nutrition-pie-chart">
            {macroShare.length === 0 ? (
              <p className="nutrition-empty">해당 기간 식단 데이터가 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroShare}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {macroShare.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<MacroTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string, entry) => {
                      const grams =
                        (entry.payload as { grams?: number } | undefined)?.grams ?? 0;
                      return `${value} ${grams.toLocaleString()}g`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
