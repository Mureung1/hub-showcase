import { Link } from 'react-router-dom'
import Thumbnail from './Thumbnail'

// 홈 화면의 카테고리 카드와 카테고리 상세 화면의 레시피 카드가 똑같은 모양이라
// 하나의 컴포넌트로 합쳐서 씀 (순위 배지는 rank가 있을 때만, 가격 뒤 문구는 priceSuffix로 다르게).
function MenuCard({ to, rank, image, emoji, name, price, priceSuffix = '원', bestTag = false, width = '' }) {
  return (
    <li className={width}>
      <Link
        to={to}
        className="relative flex flex-col overflow-hidden rounded-card border border-border bg-bg-surface shadow-md transition hover:-translate-y-[2px] hover:shadow-lg"
      >
        {rank && (
          <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface/90 text-xs font-semibold text-primary-text shadow">
            {rank}
          </span>
        )}
        <Thumbnail image={image} emoji={emoji} alt={name} className="aspect-[4/3] w-full text-4xl" />
        <div className="p-3">
          <p className="truncate text-sm font-medium text-text-primary">{name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <p className="text-lg font-extrabold text-primary-text">
              {price.toLocaleString()}
              {priceSuffix}
            </p>
            {bestTag && (
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary-text">
                최저가
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}

export default MenuCard
