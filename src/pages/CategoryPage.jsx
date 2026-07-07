import { Link, useParams } from 'react-router-dom'
import { categories } from '../data/categories'
import { mockRecipes } from '../data/mockRecipes'
import { getRecipesByCategory, getRecipesBySubgroups } from '../data/selectors'
import MenuCard from '../components/MenuCard'

function RecipeList({ recipes }) {
  return (
    <ol className="mt-3 flex flex-col gap-3">
      {recipes.map((recipe, index) => (
        <MenuCard
          key={recipe.id}
          to={`/recipe/${recipe.id}`}
          rank={index + 1}
          image={recipe.image}
          emoji={recipe.emoji}
          name={recipe.name}
          price={recipe.totalCost}
        />
      ))}
    </ol>
  )
}

function CategoryPage() {
  const { categoryId } = useParams()
  const category = categories.find((item) => item.id === categoryId)
  const hasSubgroups = Boolean(category?.subgroups)
  const recipes = hasSubgroups ? [] : getRecipesByCategory(mockRecipes, categoryId)
  const subgroups = hasSubgroups ? getRecipesBySubgroups(mockRecipes, category) : []

  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="text-sm text-gray-500 hover:text-orange-600">
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {category ? category.name : '카테고리'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">가격이 저렴한 순으로 정렬했어요.</p>

        {hasSubgroups ? (
          subgroups.map((subgroup) => (
            <section key={subgroup.id} className="mt-6">
              <h2 className="text-sm font-semibold text-gray-600">{subgroup.name}</h2>
              <RecipeList recipes={subgroup.recipes} />
            </section>
          ))
        ) : (
          <RecipeList recipes={recipes} />
        )}
      </div>
    </main>
  )
}

export default CategoryPage
