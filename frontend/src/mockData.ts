import type { Product } from './types';
import type { ChipIconName } from './chipIcons';

export const INGREDIENT_ICONS: Record<string, ChipIconName> = {
  '비타민 B군': 'battery',
  루테인: 'eye',
  안토시아닌: 'leaf',
  마그네슘: 'moon',
  프로바이오틱스: 'stomach',
  비오틴: 'hair',
  글루코사민: 'joint',
  비타민C: 'shield',
  콜라겐: 'droplet',
  테아닌: 'zigzag',
};

export const SYMPTOM_INGREDIENTS: Record<string, string[]> = {
  피로감: ['비타민 B군'],
  안구건조: ['루테인', '안토시아닌'],
  '수면 부족': ['마그네슘'],
  소화불량: ['프로바이오틱스'],
  탈모: ['비오틴'],
  관절통: ['글루코사민'],
  '면역력 저하': ['비타민C'],
  피부트러블: ['콜라겐'],
  스트레스: ['테아닌'],
};

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: '그린바이오 안토시아닌',
    companyName: '그린바이오',
    price: 18900,
    ingredients: '안토시아닌 100mg',
    reviews: 128,
    description:
      '국내 엄격한 품질 기준을 통과한 제품이에요. 매일 꾸준히 섭취하면 눈 건강과 항산화에 도움을 줄 수 있어요.',
  },
  {
    id: 2,
    name: '루테인 플러스',
    companyName: '웰니스팜',
    price: 22000,
    ingredients: '루테인 20mg · 지아잔틴',
    reviews: 94,
    description: '눈 건강에 필요한 루테인과 지아잔틴을 함께 담았어요. 장시간 화면을 보는 분들께 추천해요.',
  },
];
