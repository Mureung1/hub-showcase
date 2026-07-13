import { Router } from 'express'
import { supabase } from '../lib/supabaseClient.js'
import { getRecipesByOwnedIngredients } from '../../src/data/selectors.js'

const router = Router()

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

  const recipes = data.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    youtubeId: row.youtube_id,
    image: row.image,
    categoryId: row.category_id,
    subGroupId: row.sub_group_id,
    servings: row.servings,
    totalCost: row.total_cost,
    ingredients: row.ingredients,
  }))

  res.status(200).json({ recipes: getRecipesByOwnedIngredients(recipes, names) })
})

export default router
