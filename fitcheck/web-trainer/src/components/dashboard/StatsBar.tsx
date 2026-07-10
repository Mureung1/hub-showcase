import { useAppStore } from '../../hooks/useAppStore';
import './StatsBar.css';

export default function StatsBar() {
  const { members, data } = useAppStore();

  const redCount = members.filter((m) => m.status === 'red').length;
  const yellowCount = members.filter((m) => m.status === 'yellow').length;
  const greenCount = members.filter((m) => m.status === 'green').length;
  const pendingMeals = data.meals.filter((m) => m.pending).length;

  return (
    <section className="stats-bar">
      <div className="stat-card">
        <span className="stat-dot stat-dot-red" aria-hidden="true" />
        <div>
          <strong>{redCount}</strong>
          <span>주의 필요</span>
        </div>
      </div>
      <div className="stat-card">
        <span className="stat-dot stat-dot-yellow" aria-hidden="true" />
        <div>
          <strong>{yellowCount}</strong>
          <span>관심 필요</span>
        </div>
      </div>
      <div className="stat-card">
        <span className="stat-dot stat-dot-green" aria-hidden="true" />
        <div>
          <strong>{greenCount}</strong>
          <span>정상 관리</span>
        </div>
      </div>
      <div className="stat-card">
        <span className="stat-dot stat-dot-purple" aria-hidden="true" />
        <div>
          <strong>{pendingMeals}</strong>
          <span>피드백 대기중</span>
        </div>
      </div>
    </section>
  );
}
