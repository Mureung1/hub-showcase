export const heroContent = {
  title: 'SmartFF Agent',
  subtitle:
    'AI가 편의점 FF 상품의 판매·재고·폐기 데이터를 분석하여\n적정 발주량을 추천하는 AI 서비스',
  badges: ['AI 발주 추천', '판매 데이터 분석'],
};

export const flowContent = {
  heading: '동작 과정',
  steps: [
    { icon: '🧾', label: '판매 데이터' },
    { icon: '📦', label: '재고 데이터' },
    { icon: '🗑️', label: '폐기 데이터' },
    { icon: '🧠', label: 'AI 분석' },
    { icon: '🎯', label: '적정 발주 추천' },
  ],
};

export const problemContent = {
  heading: '해결하려는 문제',
  items: [
    {
      icon: '🚮',
      title: '과다 발주로 인한 폐기',
      description: '필요 이상으로 발주된 상품이 유통기한을 넘겨 폐기됩니다.',
    },
    {
      icon: '👤',
      title: '점주의 경험에 의존한 발주',
      description: '데이터 없이 감과 경험만으로 발주량을 결정합니다.',
    },
    {
      icon: '🧩',
      title: '데이터 분석의 어려움',
      description: '판매·재고·폐기 데이터를 따로따로 살펴보기엔 시간과 노하우가 부족합니다.',
    },
  ],
};

export const featureContent = {
  heading: '핵심 기능',
  items: [
    {
      icon: '🤖',
      title: 'AI 발주 추천',
      description: '판매 패턴을 학습해 상품별 적정 발주량을 자동으로 제안합니다.',
    },
    {
      icon: '📊',
      title: '판매/폐기 데이터 시각화',
      description: '판매량과 폐기량 추이를 그래프로 한눈에 확인할 수 있습니다.',
    },
    {
      icon: '💡',
      title: '추천 이유 설명',
      description: '왜 이 발주량을 추천하는지 근거를 함께 제공합니다.',
    },
    {
      icon: '✏️',
      title: '발주량 수정',
      description: '추천값을 참고해 점주가 직접 발주량을 조정할 수 있습니다.',
    },
  ],
};

export const effectContent = {
  heading: '기대 효과',
  items: [
    {
      icon: '♻️',
      title: '폐기 감소',
      description: '적정 발주로 불필요한 폐기를 줄여 손실을 최소화합니다.',
    },
    {
      icon: '⏰',
      title: '발주 시간 단축',
      description: '고민하던 발주 업무를 몇 분 만에 끝낼 수 있습니다.',
    },
    {
      icon: '📈',
      title: '데이터 기반 의사결정',
      description: '감이 아닌 데이터를 근거로 발주를 결정할 수 있습니다.',
    },
  ],
};
