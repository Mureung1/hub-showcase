import { categories } from '../data/categories'
import { mockRecipes } from '../data/mockRecipes'
import { getCategoriesWithCheapest } from '../data/selectors'
import MenuCard from '../components/MenuCard'

const ROWS = [
  { type: 'main', title: '메인음식' },
  { type: 'side', title: '반찬' },
  { type: 'snack', title: '간식' },
]

function Home() {
  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900">오늘의 가성비 메뉴</h1>
        <p className="mt-1 text-sm text-gray-500">
          카테고리 안에서 가장 저렴한 레시피 가격순으로 정렬했어요.
        </p>
        <div className="mt-6 flex flex-col gap-8">
          {ROWS.map((row) => {
            const rowCategories = getCategoriesWithCheapest(categories, mockRecipes, row.type)
            return (
              <section key={row.type}>
                <h2 className="mb-2 text-sm font-semibold text-gray-600">{row.title}</h2>
                <ol className="flex gap-3 overflow-x-auto pb-2">
                  {rowCategories.map((category) => (
                    <MenuCard
                      key={category.id}
                      to={`/category/${category.id}`}
                      image={category.cheapestRecipe.image}
                      emoji={category.emoji}
                      name={category.name}
                      price={category.cheapestRecipe.totalCost}
                      priceSuffix="원부터"
                      width="w-32 shrink-0 sm:w-40"
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
