import { Link } from 'react-router-dom'
import { categories, TYPE_LABELS } from '../data/categories'
import { mockRecipes } from '../data/mockRecipes'
import { getCategoriesWithCheapest } from '../data/selectors'
import MenuCard from '../components/MenuCard'
import logoEmblem from '../assets/logo-emblem.png'
import logoWordmark from '../assets/logo-wordmark.png'

const TYPES = ['main', 'side', 'snack']
const PREVIEW_COUNT = 4

function Home() {
  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <img src={logoEmblem} alt="" className="h-12 w-12 object-contain" />
          <img src={logoWordmark} alt="식비구조대" className="h-10 object-contain" />
        </div>
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
