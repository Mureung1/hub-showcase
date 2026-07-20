import { listReservations } from './reservations';
import { getTopRiskyCustomers } from './customers';
import { calculateDashboardStats } from '../utils/dashboard';
import type { CustomerSearchResult, Reservation } from '../types/schema';

export interface DashboardData {
  todayReservations: number;
  todayVisited: number;
  todayNoShow: number;
  thisMonthNoShowRate: number;
  attentionCustomers: CustomerSearchResult[];
  todayReservationList: (Reservation & { id: string })[];
}

/**
 * 대시보드용 집계 데이터를 한 번에 조회한다.
 * MVP 에서는 전체 reservations 를 읽어와 서비스 레이어에서 집계한다.
 */
export async function getDashboardData(
  storeId: string,
  today = new Date(),
): Promise<DashboardData> {
  const [allReservations, attentionCustomers] = await Promise.all([
    listReservations(storeId),
    getTopRiskyCustomers(storeId, 5),
  ]);

  const stats = calculateDashboardStats(allReservations, today);

  return {
    todayReservations: stats.today.total,
    todayVisited: stats.today.visited,
    todayNoShow: stats.today.noShow,
    thisMonthNoShowRate: stats.month.noShowRate,
    attentionCustomers,
    todayReservationList: allReservations.filter((r) => {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return r.date === `${year}-${month}-${day}`;
    }),
  };
}
