import { Link, useParams } from 'react-router-dom'
import { categories } from '../data/categories'
import { mockRecipes } from '../data/mockRecipes'
import { getRecipesByCategory } from '../data/selectors'
import RecipeCard from '../components/RecipeCard'

function CategoryPage() {
  const { categoryId } = useParams()
  const category = categories.find((item) => item.id === categoryId)
  const recipes = getRecipesByCategory(mockRecipes, categoryId)

  return (
    <main className="min-h-screen bg-orange-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="text-sm text-gray-500 hover:text-orange-600">
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {category ? category.name : '카테고리'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">가격이 저렴한 순으로 정렬했어요.</p>
        <ol className="mt-6 flex flex-col gap-3">
          {recipes.map((recipe, index) => (
            <RecipeCard key={recipe.id} rank={index + 1} {...recipe} />
          ))}
        </ol>
      </div>
    </main>
  )
}

export default CategoryPage
