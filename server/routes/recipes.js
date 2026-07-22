import { Router } from 'express'
import { supabase } from '../lib/supabaseClient.js'
import { getRecipesByOwnedIngredients } from '../../src/data/selectors.js'

const router = Router()

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
  }
}

router.get('/', async (req, res) => {
  const { matchNames } = req.query
  const names = matchNames ? matchNames.split(',').filter(Boolean) : []

  if (names.length === 0) {
    res.status(200).json({ recipes: [] })
    return
  }

  const { data, error } = await supabase.from('recipes').select('*')

  if (error) {
    res.status(502).json({ error: 'Supabase에 연결할 수 없습니다.' })
    return
  }

  res.status(200).json({ recipes: getRecipesByOwnedIngredients(data.map(mapRecipeRow), names) })
})

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', req.params.id).maybeSingle()

  if (error) {
    res.status(502).json({ error: 'Supabase에 연결할 수 없습니다.' })
    return
  }

  if (!data) {
    res.status(404).json({ error: '레시피를 찾을 수 없습니다.' })
    return
  }

  res.status(200).json({ recipe: mapRecipeRow(data) })
})

export default router
