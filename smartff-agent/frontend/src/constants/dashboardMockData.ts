import type { DashboardData } from '../types/dashboard';

export const DASHBOARD_MOCK_DATA: DashboardData = {
  storeName: 'GS25 강남역점',
  storeStatus: '누적 데이터 분석 완료',
  brief: {
    titleHighlight: '도시락',
    titleRest: ' 발주 확대 검토',
    reasons: ['최근 1개월 판매 증가', '폐기율 안정적 유지', '도시락 카테고리 우선 확인 권장'],
    ctaLabel: '확인 완료로 표시',
  },
  risk: {
    title: '삼각김밥\n발주 축소 검토',
    reasons: ['폐기 지속 증가 추세', '재고 과잉', '판매 정체'],
    ctaLabel: '삼각김밥 상세 보기 →',
  },
  kpis: {
    salesTrend: '+18',
    salesNote: '최근 1개월 기준 · 상승세',
    wasteRate: '3.2',
    wasteNote: '최근 1개월 기준 · 안정적',
    marginRate: '38',
    marginNote: '최근 1개월 기준 · 고수익',
  },
  weeklyTrend: {
    totalLabel: '2,900천원',
    points: [
      { label: '6월 3주차', amount: 620, tooltip: '6월 3주차 · 매출 620천원' },
      { label: '6월 4주차', amount: 680, tooltip: '6월 4주차 · 매출 680천원' },
      { label: '6/29~7/5', amount: 750, tooltip: '6/29~7/5 · 매출 750천원' },
      { label: '7월 1주차', amount: 850, tooltip: '7월 1주차 · 매출 850천원' },
    ],
    bestWeek: '7월 1주차',
  },
  marginBars: [
    { name: '김밥', rate: 40, delta: '전월 대비 +1%p', deltaGood: true, isTop: true, isAiPick: false, isRisk: false },
    { name: '도시락', rate: 38, delta: '전월 대비 +2%p', deltaGood: true, isTop: false, isAiPick: true, isRisk: false },
    { name: '햄버거샌드위치', rate: 22, delta: '전월 대비 -1%p', deltaGood: false, isTop: false, isAiPick: false, isRisk: false },
    { name: '삼각김밥', rate: 15, delta: '전월 대비 -3%p', deltaGood: false, isTop: false, isAiPick: false, isRisk: true },
  ],
};
