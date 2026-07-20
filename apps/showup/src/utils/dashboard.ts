import type { Reservation } from '../types/schema';

interface DailyStats {
  total: number;
  visited: number;
  noShow: number;
  cancelled: number;
  pending: number;
}

interface DashboardStats {
  today: DailyStats;
  month: {
    total: number;
    noShowCount: number;
    noShowRate: number; // 0 ~ 100
  };
}

function buildDailyStats(reservations: Reservation[]): DailyStats {
  const total = reservations.length;
  const visited = reservations.filter((r) => r.status === 'visited').length;
  const noShow = reservations.filter((r) => r.status === 'noShow').length;
  const cancelled = reservations.filter((r) => r.status === 'cancelled').length;
  const pending = reservations.filter(
    (r) => r.status === 'pending' || r.status === 'confirmed',
  ).length;
  return { total, visited, noShow, cancelled, pending };
}

function isSameMonth(dateStr: string, at: Date): boolean {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}`;
  return dateStr.startsWith(prefix);
}

/**
 * 대시보드용 집계 통계를 계산한다.
 * reservations 전체를 받아 today/month 집계를 반환.
 */
export function calculateDashboardStats(
  reservations: Reservation[],
  today = new Date(),
): DashboardStats {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const todayReservations = reservations.filter((r) => r.date === todayStr);
  const monthReservations = reservations.filter((r) => isSameMonth(r.date, today));

  const monthStats = buildDailyStats(monthReservations);
  const noShowRate = monthStats.total === 0 ? 0 : (monthStats.noShow / monthStats.total) * 100;

  return {
    today: buildDailyStats(todayReservations),
    month: {
      total: monthStats.total,
      noShowCount: monthStats.noShow,
      noShowRate: Math.round(noShowRate * 10) / 10,
    },
  };
}
