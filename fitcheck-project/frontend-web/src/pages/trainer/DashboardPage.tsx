import { useState } from 'react';
import StatsBar from '../../components/dashboard/StatsBar';
import SignalPanel from '../../components/dashboard/SignalPanel';
import RoutinePanel from '../../components/dashboard/RoutinePanel';
import NutritionChartPanel from '../../components/dashboard/NutritionChartPanel';
import ActivityHistoryPanel from '../../components/dashboard/ActivityHistoryPanel';
import MealTimeline from '../../components/dashboard/MealTimeline';
import type { NutritionPeriod } from '../../utils/nutrition';
import './DashboardPage.css';

export default function DashboardPage() {
  const [period, setPeriod] = useState<NutritionPeriod>(7);

  return (
    <>
      <StatsBar />
      <main className="dashboard-page">
        <SignalPanel />
        <RoutinePanel />
        <NutritionChartPanel period={period} onPeriodChange={setPeriod} />
        <ActivityHistoryPanel period={period} onPeriodChange={setPeriod} />
        <MealTimeline />
      </main>
    </>
  );
}
