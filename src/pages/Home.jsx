import { categories } from '../data/categories'
import { mockRecipes } from '../data/mockRecipes'
import { getCategoriesWithCheapest } from '../data/selectors'
import CategoryCard from '../components/CategoryCard'

function Home() {
  const mainCategories = getCategoriesWithCheapest(categories, mockRecipes, 'main')
  const sideCategories = getCategoriesWithCheapest(categories, mockRecipes, 'side')

  return (
    <main className="min-h-screen bg-orange-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">오늘의 가성비 메뉴</h1>
        <p className="mt-1 text-sm text-gray-500">
          카테고리 안에서 가장 저렴한 레시피 가격순으로 정렬했어요.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-600">메인음식</h2>
            <ol className="flex flex-col gap-2">
              {mainCategories.map((category) => (
                <CategoryCard key={category.id} {...category} />
              ))}
            </ol>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-600">반찬</h2>
            <ol className="flex flex-col gap-2">
              {sideCategories.map((category) => (
                <CategoryCard key={category.id} {...category} />
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  )
}

export default Home
