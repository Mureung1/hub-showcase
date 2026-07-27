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
  두통: 9,
  '빈혈·어지러움': 10,
  '탈모·모발 손상': 11,
};

export const INGREDIENT_ICONS: Record<string, ChipIconName> = {
  니아신: 'battery',
  '비타민 B6': 'battery',
  엽산: 'battery',
  마그네슘: 'moon',
  프로바이오틱스: 'stomach',
  루테인: 'eye',
  오메가3: 'joint',
  '비타민 D': 'shield',
  아연: 'shield',
  콜라겐: 'droplet',
  '비타민 C': 'shield',
  철분: 'battery',
  칼슘: 'joint',
  '비타민 A': 'eye',
};
