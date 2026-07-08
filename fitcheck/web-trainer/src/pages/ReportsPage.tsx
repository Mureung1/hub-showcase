import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '../hooks/useAppStore';
import {
  getExerciseOptions,
  getGrowthSummary,
  getMealWeeklyData,
  getMemberWorkouts,
  getMilestones,
  getOverloadChartDataForExercise,
} from '../utils/growth';
import './ReportsPage.css';

const CHART_COLORS = {
  accent: '#e63946',
  accentFill: 'rgba(230, 57, 70, 0.2)',
  green: '#22c55e',
  grid: '#2e3344',
  text: '#9ca3b4',
  tooltipBg: '#1a1d27',
  target: '#2e3344',
};

function CustomTooltip({
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
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
          {entry.name.includes('중량') ? 'kg' : entry.name.includes('볼륨') ? '' : '건'}
        </p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { members, data, selectedMemberId, setSelectedMemberId } =
    useAppStore();
  const [exerciseIndex, setExerciseIndex] = useState(0);

  const selectedMember =
    members.find((m) => m.id === selectedMemberId) ?? members[0];

  const memberWorkouts = useMemo(
    () =>
      selectedMember
        ? getMemberWorkouts(selectedMember.id, data.workoutHistory)
        : [],
    [selectedMember, data.workoutHistory],
  );

  const exerciseOptions = useMemo(
    () => getExerciseOptions(memberWorkouts),
    [memberWorkouts],
  );

  const chartData = useMemo(() => {
    if (memberWorkouts.length === 0) return [];
    return getOverloadChartDataForExercise(memberWorkouts, exerciseIndex);
  }, [memberWorkouts, exerciseIndex]);

  const summary = useMemo(() => {
    if (!selectedMember) {
      return {
        totalSessions: 0,
        mealCompliance: 0,
        prWeight: 0,
        prExercise: '-',
        weekChange: 0,
        totalVolume: 0,
      };
    }
    return getGrowthSummary(
      selectedMember.id,
      data.workoutHistory,
      data.meals,
    );
  }, [selectedMember, data.workoutHistory, data.meals]);

  const mealWeekly = useMemo(() => {
    if (!selectedMember) return [];
    return getMealWeeklyData(selectedMember.id, data.meals);
  }, [selectedMember, data.meals]);

  const milestones = useMemo(() => {
    if (!selectedMember) return [];
    return getMilestones(
      selectedMember.id,
      data.workoutHistory,
      data.meals,
    );
  }, [selectedMember, data.workoutHistory, data.meals]);

  const mainExerciseName =
    exerciseOptions[exerciseIndex]?.name ?? chartData[0]?.exercise ?? '-';

  if (!selectedMember) return null;

  return (
    <div className="reports-page">
      <div className="page-header reports-header">
        <div>
          <h1>성장 리포트</h1>
          <p>회원의 점진적 과부하 추이와 식단 준수 현황을 확인하세요</p>
        </div>
        <div className="member-select-wrap">
          <label htmlFor="report-member">회원</label>
          <select
            id="report-member"
            value={selectedMemberId}
            onChange={(e) => {
              setSelectedMemberId(e.target.value);
              setExerciseIndex(0);
            }}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="member-goal-banner">
        <span className="member-goal-avatar">{selectedMember.avatar}</span>
        <div>
          <strong>{selectedMember.name}</strong>
          <span>{selectedMember.goal}</span>
        </div>
      </div>

      <section className="summary-cards">
        <div className="summary-card">
          <span className="summary-label">총 세션</span>
          <strong className="summary-value">{summary.totalSessions}회</strong>
          <span className="summary-sub">8주 프로그램</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">식단 준수율</span>
          <strong className="summary-value">{summary.mealCompliance}%</strong>
          <span className="summary-sub">최근 4주 기준</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">PR 중량</span>
          <strong className="summary-value">{summary.prWeight}kg</strong>
          <span className="summary-sub">{summary.prExercise}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">이번 주 변화</span>
          <strong
            className={`summary-value ${summary.weekChange > 0 ? 'positive' : summary.weekChange < 0 ? 'negative' : ''}`}
          >
            {summary.weekChange > 0 ? '+' : ''}
            {summary.weekChange}kg
          </strong>
          <span className="summary-sub">전주 대비</span>
        </div>
      </section>

      <div className="charts-layout">
        <section className="chart-panel overload-panel">
          <div className="chart-panel-header">
            <div>
              <h2>점진적 과부하 추이</h2>
              <p>{mainExerciseName} 중량 · 세션 볼륨</p>
            </div>
            {exerciseOptions.length > 1 && (
              <select
                className="exercise-select"
                value={exerciseIndex}
                onChange={(e) => setExerciseIndex(Number(e.target.value))}
              >
                {exerciseOptions.map((opt) => (
                  <option key={opt.index} value={opt.index}>
                    {opt.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {chartData.length === 0 ? (
            <div className="chart-empty">운동 기록이 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={{ stroke: CHART_COLORS.grid }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="weight"
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  unit="kg"
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  hide
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: CHART_COLORS.text }}
                />
                <Area
                  yAxisId="weight"
                  type="monotone"
                  dataKey="weight"
                  name="중량"
                  stroke={CHART_COLORS.accent}
                  fill="url(#weightGradient)"
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.accent, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="volume"
                  type="monotone"
                  dataKey="volume"
                  name="볼륨"
                  stroke={CHART_COLORS.green}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="chart-panel meal-panel">
          <div className="chart-panel-header">
            <div>
              <h2>식단 업로드 현황</h2>
              <p>주간 업로드 건수 (목표 7건/주)</p>
            </div>
          </div>

          {mealWeekly.length === 0 ? (
            <div className="chart-empty">식단 기록이 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mealWeekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  axisLine={{ stroke: CHART_COLORS.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="업로드"
                  fill={CHART_COLORS.accent}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="target"
                  name="목표"
                  fill={CHART_COLORS.target}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                  opacity={0.5}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <section className="milestones-panel">
        <h2>최근 마일스톤</h2>
        {milestones.length === 0 ? (
          <p className="milestones-empty">아직 마일스톤이 없습니다.</p>
        ) : (
          <ul className="milestones-list">
            {milestones.map((ms) => (
              <li key={ms.id} className={`milestone-item milestone-${ms.type}`}>
                <span className="milestone-icon">
                  {ms.type === 'pr' && '🏆'}
                  {ms.type === 'streak' && '🔥'}
                  {ms.type === 'volume' && '💪'}
                </span>
                <div>
                  <p>{ms.text}</p>
                  <time>{ms.date}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
