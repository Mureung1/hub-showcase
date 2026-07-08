import { AlertCircle, CheckCircle2, ClipboardList, AlertTriangle } from 'lucide-react';
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
      <div className="stat-card stat-red">
        <span className="stat-icon-wrap stat-icon-red">
          <AlertCircle size={18} />
        </span>
        <div>
          <strong>{redCount}</strong>
          <span>주의 필요</span>
        </div>
      </div>
      <div className="stat-card stat-yellow">
        <span className="stat-icon-wrap stat-icon-yellow">
          <AlertTriangle size={18} />
        </span>
        <div>
          <strong>{yellowCount}</strong>
          <span>관심 필요</span>
        </div>
      </div>
      <div className="stat-card stat-green">
        <span className="stat-icon-wrap stat-icon-green">
          <CheckCircle2 size={18} />
        </span>
        <div>
          <strong>{greenCount}</strong>
          <span>정상 관리</span>
        </div>
      </div>
      <div className="stat-card stat-meal">
        <span className="stat-icon-wrap stat-icon-accent">
          <ClipboardList size={18} />
        </span>
        <div>
          <strong>{pendingMeals}</strong>
          <span>피드백 대기</span>
        </div>
      </div>
    </section>
  );
}
