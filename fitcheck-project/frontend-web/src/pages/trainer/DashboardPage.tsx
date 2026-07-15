import StatsBar from '../../components/dashboard/StatsBar';
import SignalPanel from '../../components/dashboard/SignalPanel';
import RoutinePanel from '../../components/dashboard/RoutinePanel';
import NutritionChartPanel from '../../components/dashboard/NutritionChartPanel';
import MealTimeline from '../../components/dashboard/MealTimeline';
import './DashboardPage.css';

export default function DashboardPage() {
  return (
    <>
      <StatsBar />
      <main className="dashboard-page">
        <SignalPanel />
        <RoutinePanel />
        <NutritionChartPanel />
        <MealTimeline />
      </main>
    </>
  );
}
