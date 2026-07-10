import { Link } from 'react-router-dom'
import { categories, TYPE_LABELS } from '../data/categories'
import { mockRecipes } from '../data/mockRecipes'
import { getCategoriesWithCheapest, getRecipesByOwnedIngredients } from '../data/selectors'
import { fridgeIngredients } from '../data/fridgeIngredients'
import { loadFridgeSelection } from '../data/fridgeStorage'
import MenuCard from '../components/MenuCard'

const TYPES = ['main', 'side', 'snack']
const PREVIEW_COUNT = 4

function Home() {
  const selectedIds = loadFridgeSelection()
  const ownedMatchNames = fridgeIngredients
    .filter((ingredient) => selectedIds.includes(ingredient.id))
    .flatMap((ingredient) => ingredient.matchNames)
  const matchedRecipes = getRecipesByOwnedIngredients(mockRecipes, ownedMatchNames)

  return (
    <main className="min-h-screen bg-bg-page px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {matchedRecipes.length > 0 && (
          <section className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-text-primary">냉장고 재료로 만들 수 있는 요리</h2>
              <Link to="/" className="text-xs text-text-secondary underline hover:text-text-primary">
                재료 다시 고르기 →
              </Link>
            </div>
            <ol className="mt-2 grid grid-cols-2 gap-3">
              {matchedRecipes.map((recipe) => (
                <MenuCard
                  key={recipe.id}
                  to={`/recipe/${recipe.id}`}
                  image={recipe.image}
                  emoji={recipe.emoji}
                  name={recipe.name}
                  price={recipe.totalCost}
                  priceSuffix="원"
                />
              ))}
            </ol>
          </section>
        )}

        <div className="mt-6 flex flex-col gap-8">
          {TYPES.map((type) => {
            const typeCategories = getCategoriesWithCheapest(categories, mockRecipes, type)
            return (
              <section key={type}>
                <Link
                  to={`/type/${type}`}
                  className="mb-2 inline-block text-sm font-semibold text-gray-600 hover:text-orange-600"
                >
                  {TYPE_LABELS[type]} →
                </Link>
                <ol className="grid grid-cols-2 gap-3">
                  {typeCategories.slice(0, PREVIEW_COUNT).map((category) => (
                    <MenuCard
                      key={category.id}
                      to={`/category/${category.id}`}
                      image={category.cheapestRecipe.image}
                      emoji={category.emoji}
                      name={category.name}
                      price={category.cheapestRecipe.totalCost}
                      priceSuffix="원부터"
                    />
                  ))}
                </ol>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}

export default Home
