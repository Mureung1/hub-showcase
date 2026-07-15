import type { Product } from './types';

export const SYMPTOM_INGREDIENTS: Record<string, string[]> = {
  피로감: ['비타민 B군'],
  안구건조: ['루테인', '안토시아닌'],
  '수면 부족': ['마그네슘'],
  소화불량: ['프로바이오틱스'],
};

export const PRODUCTS: Product[] = [
  { id: 1, name: '그린바이오 안토시아닌', companyTag: '중소기업', price: 18900 },
  { id: 2, name: '루테인 플러스', companyTag: '대기업', price: 22000 },
];
