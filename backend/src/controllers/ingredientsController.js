import { ingredients } from '../data/ingredients.js';

export async function getIngredients(req, res) {
  // 클라이언트에게 재료 마스터 배열과 필요한 유틸 데이터를 전송
  res.json({ ingredients });
}
