import type { CustomerSearchResult, Reservation, ReservationWithId } from '../types/schema';

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
 * FE에서 reservations 전체를 받아오거나, BE에서 집계 후 전달할 수 있다.
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

/**
 * FE 대시보드용: ReservationWithId[] + CustomerSearchResult[] 를 받아
 * 카드별 요약 데이터를 만든다.
 */
export function buildDashboardData(
  reservations: ReservationWithId[],
  riskyCustomers: CustomerSearchResult[],
  today = new Date(),
) {
  const stats = calculateDashboardStats(reservations, today);

  return {
    todayReservations: stats.today.total,
    todayVisited: stats.today.visited,
    todayNoShow: stats.today.noShow,
    thisMonthNoShowRate: stats.month.noShowRate,
    attentionCustomers: riskyCustomers,
    todayReservationList: reservations.filter((r) => {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return r.date === `${year}-${month}-${day}`;
    }),
  };
}
