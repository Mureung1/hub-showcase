import { categories } from '../data/categories'
import { mockRecipes } from '../data/mockRecipes'
import { getCategoriesWithCheapest } from '../data/selectors'
import CategoryCard from '../components/CategoryCard'

const COLUMNS = [
  { type: 'main', title: '메인음식' },
  { type: 'side', title: '반찬' },
  { type: 'snack', title: '간식' },
]

function Home() {
  return (
    <main className="min-h-screen bg-orange-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900">오늘의 가성비 메뉴</h1>
        <p className="mt-1 text-sm text-gray-500">
          카테고리 안에서 가장 저렴한 레시피 가격순으로 정렬했어요.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {COLUMNS.map((column) => {
            const columnCategories = getCategoriesWithCheapest(categories, mockRecipes, column.type)
            return (
              <section key={column.type}>
                <h2 className="mb-2 text-sm font-semibold text-gray-600">{column.title}</h2>
                <ol className="flex flex-col gap-2">
                  {columnCategories.map((category) => (
                    <CategoryCard key={category.id} {...category} />
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
