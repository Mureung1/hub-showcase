// mockRecipes.js를 Supabase recipes 테이블에 1회 넣는 시딩 스크립트.
// 실행: node --env-file=.env.local scripts/seedRecipes.js (또는 npm run seed:recipes)
// 레시피 데이터를 다시 손보고 나면 다시 실행해서 테이블을 최신 상태로 맞춘다 (upsert라 재실행해도 안전).
import { supabase } from '../server/lib/supabaseClient.js'
import { mockRecipes } from '../src/data/mockRecipes.js'

const rows = mockRecipes.map((recipe) => ({
  id: recipe.id,
  name: recipe.name,
  emoji: recipe.emoji,
  youtube_id: recipe.youtubeId,
  image: recipe.image,
  category_id: recipe.categoryId,
  sub_group_id: recipe.subGroupId ?? null,
  cook_time_minutes: recipe.cookTimeMinutes,
  servings: recipe.servings,
  total_cost: recipe.totalCost,
  ingredients: recipe.ingredients,
  steps: recipe.steps ?? null,
}))

const { error } = await supabase.from('recipes').upsert(rows)

if (error) {
  console.error('[seed:recipes] 실패:', error.message)
  process.exit(1)
}

console.log(`[seed:recipes] ${rows.length}개 레시피를 recipes 테이블에 저장했습니다.`)
