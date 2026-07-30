import { supabase } from '../lib/supabaseClient.js'

function mapRecipeRow(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    youtubeId: row.youtube_id,
    image: row.image,
    categoryId: row.category_id,
    subGroupId: row.sub_group_id,
    cookTimeMinutes: row.cook_time_minutes,
    servings: row.servings,
    totalCost: row.total_cost,
    ingredients: row.ingredients,
    steps: row.steps,
    tip: row.tip,
  }
}

function supabaseConnectionError() {
  const error = new Error('Supabase에 연결할 수 없습니다.')
  error.status = 502
  return error
}

export async function getAllRecipes() {
  const { data, error } = await supabase.from('recipes').select('*')

  if (error) {
    throw supabaseConnectionError()
  }

  return data.map(mapRecipeRow)
}

export async function getRecipeById(id) {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).maybeSingle()

  if (error) {
    throw supabaseConnectionError()
  }

  if (!data) {
    const notFoundError = new Error('레시피를 찾을 수 없습니다.')
    notFoundError.status = 404
    throw notFoundError
  }

  return mapRecipeRow(data)
}
