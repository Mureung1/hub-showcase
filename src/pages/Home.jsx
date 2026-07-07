import { mockRecipes } from '../data/mockRecipes'
import RecipeCard from '../components/RecipeCard'

function sortByCost(recipes) {
  return [...recipes].sort((a, b) => a.totalCost - b.totalCost)
}

function Home() {
  const mains = sortByCost(mockRecipes.filter((recipe) => recipe.category === 'main'))
  const sides = sortByCost(mockRecipes.filter((recipe) => recipe.category === 'side'))

  return (
    <main className="min-h-screen bg-orange-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">오늘의 가성비 메뉴</h1>
        <p className="mt-1 text-sm text-gray-500">
          1인분 재료비가 저렴한 순으로 정렬했어요.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-600">메인음식</h2>
            <ol className="flex flex-col gap-2">
              {mains.map((recipe, index) => (
                <RecipeCard key={recipe.id} rank={index + 1} {...recipe} />
              ))}
            </ol>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-600">반찬</h2>
            <ol className="flex flex-col gap-2">
              {sides.map((recipe, index) => (
                <RecipeCard key={recipe.id} rank={index + 1} {...recipe} />
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  )
}

export default Home
