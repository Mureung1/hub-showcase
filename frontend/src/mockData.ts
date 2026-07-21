import type { ChipIconName } from './chipIcons';

// DB symptoms 테이블 시딩 순서(backend/migrations/002_seed_symptoms_ingredients.sql)와 일치해야 함
export const SYMPTOM_ID_BY_NAME: Record<string, number> = {
  피로: 1,
  소화불량: 2,
  수면장애: 3,
  '눈 피로': 4,
  '관절 통증': 5,
  스트레스: 6,
  '면역력 저하': 7,
  '피부 트러블': 8,
};

export const INGREDIENT_ICONS: Record<string, ChipIconName> = {
  '비타민 B군': 'battery',
  마그네슘: 'moon',
  프로바이오틱스: 'stomach',
  루테인: 'eye',
  오메가3: 'joint',
  '비타민 D': 'shield',
  아연: 'shield',
  콜라겐: 'droplet',
};
