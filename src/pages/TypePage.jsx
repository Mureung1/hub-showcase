import { Link, useParams } from 'react-router-dom'
import { categories, TYPE_LABELS } from '../data/categories'
import { mockRecipes } from '../data/mockRecipes'
import { getCategoriesWithCheapest } from '../data/selectors'
import MenuCard from '../components/MenuCard'

function TypePage() {
  const { type } = useParams()
  const typeCategories = getCategoriesWithCheapest(categories, mockRecipes, type)

  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/home" className="text-sm text-gray-500 hover:text-orange-600">
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {TYPE_LABELS[type] ?? '카테고리'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">가장 저렴한 레시피 가격순으로 정렬했어요.</p>
        <ol className="mt-6 grid grid-cols-2 gap-3">
          {typeCategories.map((category) => (
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
      </div>
    </main>
  )
}

export default TypePage
