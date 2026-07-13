// Mock 통계 데이터 (4개 파스텔 카드)
export const statCardsData = [
  {
    id: 1,
    icon: '🎬',
    value: '1,024',
    label: '생성된 릴스 총합',
    color: 'pink'
  },
  {
    id: 2,
    icon: '📈',
    value: '34.2%',
    label: '평균 목적지 CTR',
    color: 'orange'
  },
  {
    id: 3,
    icon: '#',
    value: '15',
    label: '오늘 발굴된 트렌드',
    color: 'green'
  },
  {
    id: 4,
    icon: '❤️',
    value: '8,400',
    label: '누적 좋아요 획득',
    color: 'purple'
  }
];

// Mock CTR 차트 데이터
export const ctrChartData = {
  labels: ['월', '화', '수', '목', '금', '토', '일'],
  datasets: [
    {
      label: '조회수',
      data: [1200, 1900, 3000, 2500, 2200, 3400, 4100],
      backgroundColor: '#5D5FEF',
      borderRadius: 4
    },
    {
      label: '목적지 클릭 (CTR)',
      data: [800, 1200, 2500, 1800, 1900, 2900, 3200],
      backgroundColor: '#43E0AA',
      borderRadius: 4
    }
  ]
};

// Mock 트렌드 태그 데이터
export const trendTagsData = [
  { id: 1, tag: '#빵지순례', color: 'purple' },
  { id: 2, tag: '#연남동데이트', color: 'pink' },
  { id: 3, tag: '#겉바속촉', color: 'green' },
  { id: 4, tag: '#카페투어', color: 'orange' }
];

// Mock 인기 릴스 랭킹 데이터
export const topReelsData = [
  {
    id: 1,
    title: '#빵지순례 크루아상',
    views: '12.5k',
    percentage: 85
  },
  {
    id: 2,
    title: '여름 한정 수박주스',
    views: '8.2k',
    percentage: 60
  },
  {
    id: 3,
    title: '사장님 브이로그',
    views: '5.1k',
    percentage: 40
  }
];

// Mock 감정분석 도넛 차트 데이터
export const sentimentChartData = {
  labels: ['긍정적 (방문 희망)', '중립 (단순 호기심)', '기타'],
  datasets: [
    {
      data: [65, 25, 10],
      backgroundColor: ['#5D5FEF', '#43E0AA', '#F1F3F9'],
      borderWidth: 0
    }
  ]
};

// Mock 플랫폼 비교 차트 데이터
export const platformChartData = {
  labels: ['1주차', '2주차', '3주차', '4주차'],
  datasets: [
    {
      label: '인스타그램',
      data: [120, 190, 300, 250],
      backgroundColor: '#FF5B5B',
      borderRadius: 4
    },
    {
      label: '틱톡',
      data: [80, 120, 250, 180],
      backgroundColor: '#151D48',
      borderRadius: 4
    }
  ]
};

// 색상 매핑
export const colorMap = {
  pink: { bg: 'bg-[#FFE2E5]', text: 'text-[#FF5B5B]', bar: '#FF5B5B' },
  orange: { bg: 'bg-[#FFF4DE]', text: 'text-[#FFAA00]', bar: '#FFAA00' },
  green: { bg: 'bg-[#DCFCE7]', text: 'text-[#00B074]', bar: '#00B074' },
  purple: { bg: 'bg-[#F3E8FF]', text: 'text-[#A064FA]', bar: '#A064FA' }
};
