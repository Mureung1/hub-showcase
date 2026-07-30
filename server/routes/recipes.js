import { Router } from 'express'
import { getAllRecipes, getRecipeById } from '../services/recipesService.js'
import { getRecipesByOwnedIngredients } from '../../src/data/selectors.js'

const router = Router()

router.get('/', async (req, res) => {
  const { matchNames } = req.query
  const names = matchNames ? matchNames.split(',').filter(Boolean) : []

  if (names.length === 0) {
    res.status(200).json({ recipes: [] })
    return
  }

  try {
    const recipes = await getAllRecipes()
    res.status(200).json({ recipes: getRecipesByOwnedIngredients(recipes, names) })
  } catch (error) {
    res.status(error.status ?? 502).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const recipe = await getRecipeById(req.params.id)
    res.status(200).json({ recipe })
  } catch (error) {
    res.status(error.status ?? 502).json({ error: error.message })
  }
})

export default router
