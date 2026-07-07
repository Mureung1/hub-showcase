import { mockRecipes } from '../data/mockRecipes'
import RecipeCard from '../components/RecipeCard'

function Home() {
  const top10 = [...mockRecipes]
    .sort((a, b) => a.totalCost - b.totalCost)
    .slice(0, 10)

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-gray-100">오늘의 가성비 Top10</h1>
        <p className="mt-1 text-sm text-gray-400">
          1인분 총 재료비가 저렴한 순으로 정렬했어요.
        </p>
        <ol className="mt-6 flex flex-col gap-3">
          {top10.map((recipe, index) => (
            <RecipeCard key={recipe.id} rank={index + 1} {...recipe} />
          ))}
        </ol>
      </div>
    </main>
  )
}

export default Home
