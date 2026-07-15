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
  { id: 1, name: '그린바이오 안토시아닌', companyTag: '중소기업', price: 18900 },
  { id: 2, name: '루테인 플러스', companyTag: '대기업', price: 22000 },
];
