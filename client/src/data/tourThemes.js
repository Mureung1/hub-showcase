// 빵투어 테마 — 각 테마는 전체 빵집 목록(+위치/찜 목록)에서 어울리는 곳을 자동으로 골라낸다.
// "대흥동 빵투어"/"성심당 투어"처럼 특정 동네·특정 가게를 기준으로 하는 테마는 우리 주소 데이터가
// 도로명 기준이라 자동으로 판단하기 애매해서(동 이름과 도로명이 항상 일치하지 않음) 여기엔 넣지
// 않았다 — 전부 이미 있는 데이터(카테고리/가격대/영업시간/위치/찜)만으로 계산 가능한 것만 골랐다.
import { haversineDistanceKm } from '../utils/geo.js';
import { RANK_COLORS } from '../utils/routeCalc.js';

const TOUR_SIZE = 4;
const WALK_CLUSTER_RADIUS_KM = 1;

function take(list, count = TOUR_SIZE) {
  return list.slice(0, count);
}

// "뚜벅이 여행" — 서로 반경 1km 안에 가장 많이 몰려 있는 빵집 무리를 찾는다(중심점 후보를 전부
// 돌면서 각 후보 기준 이웃 수를 세고, 가장 이웃이 많은 곳을 채택). 좌표가 고정이라 항상 같은
// 결과가 나온다(새로고침해도 매번 바뀌는 지도 마커 무작위 30개와는 다른 성격).
function findWalkableCluster(bakeries) {
  let best = [];
  for (const center of bakeries) {
    const neighbors = bakeries
      .map((b) => ({ b, dist: haversineDistanceKm(center, b) }))
      .filter((n) => n.dist <= WALK_CLUSTER_RADIUS_KM)
      .sort((a, b) => a.dist - b.dist)
      .map((n) => n.b);
    if (neighbors.length > best.length) best = neighbors;
  }
  return take(best);
}

export function accentSoft(hex, alpha = 0.14) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const TOUR_THEMES = [
  {
    id: 'coffee',
    label: '커피와 함께',
    emoji: '☕',
    description: '커피도 같이 즐길 수 있는 빵집끼리 모았어요.',
    accent: RANK_COLORS[0],
    select: ({ bakeries }) => take(bakeries.filter((b) => b.hasCoffee)),
  },
  {
    id: 'walkable',
    label: '뚜벅이 여행',
    emoji: '🚶',
    description: '서로 걸어서 갈 수 있을 만큼 가까운 빵집끼리 모았어요.',
    accent: RANK_COLORS[1],
    select: ({ bakeries }) => findWalkableCluster(bakeries),
  },
  {
    id: 'earlyBird',
    label: '얼리버드 투어',
    emoji: '🌅',
    description: '아침 일찍 문을 여는 빵집 위주로 모았어요.',
    accent: RANK_COLORS[2],
    select: ({ bakeries }) =>
      take([...bakeries].filter((b) => b.openHour != null).sort((a, b) => a.openHour - b.openHour)),
  },
  {
    id: 'budget',
    label: '가성비 투어',
    emoji: '💰',
    description: '가격 부담 적은 빵집 위주로 모았어요.',
    accent: RANK_COLORS[3],
    select: ({ bakeries }) => take([...bakeries].filter((b) => b.priceTier === 1).sort((a, b) => a.id - b.id)),
  },
  {
    id: 'nearby',
    label: '내 주변 투어',
    emoji: '📍',
    description: '지금 출발지에서 가장 가까운 빵집끼리 모았어요.',
    accent: RANK_COLORS[4],
    select: ({ bakeries, userLocation }) =>
      take([...bakeries].sort((a, b) => haversineDistanceKm(userLocation, a) - haversineDistanceKm(userLocation, b))),
  },
  {
    id: 'wishlist',
    label: '내가 찜한 곳 투어',
    emoji: '❤️',
    description: '내가 찜해둔 빵집으로만 코스를 짜요.',
    accent: RANK_COLORS[5],
    select: ({ bakeries, wishlist }) => bakeries.filter((b) => wishlist.has(b.id)),
  },
];
