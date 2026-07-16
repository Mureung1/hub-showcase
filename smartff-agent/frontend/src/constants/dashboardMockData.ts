import type { DashboardData } from '../types/dashboard';

export const DASHBOARD_MOCK_DATA: DashboardData = {
  briefTitle: '도시락 발주 확대 검토',
  briefReasons: ['토요일 판매 집중 +18%', '점심 피크타임 수요 증가', '폐기율 안정적'],
  briefCta: '확인 완료로 표시',
  kpiSales: '+18%',
  kpiWasteRate: 2.8,
  kpiMarginRate: 28,
  salesWeekly: [98, 102, 95, 108, 112, 118, 110, 122, 130, 138, 145, 158],
  wasteWeekly: [2.8, 2.6, 2.9, 2.7, 2.8, 3.0, 2.7, 2.9, 2.8, 3.0, 2.9, 2.8],
  storeName: 'GS25 강남역점',
  storeStatus: '정상 운영 중',
};
