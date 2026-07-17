import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useItemSearch } from '../features/search/useItemSearch'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  const { data: results = [], isLoading, isError } = useItemSearch(query)

  return (
    <div>
      <PageHeader title="물건 검색" backTo="/" />
      <div className="px-5 pt-[18px] pb-[90px]">
        <div className="flex items-center gap-2 rounded-md border-[1.5px] border-green-600 px-[14px] py-[13px]">
          <span aria-hidden>🔍</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 피자 상자, 건전지..."
            className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-sub"
          />
        </div>

        {trimmed && (
          <div className="mt-6 text-xs font-extrabold tracking-wider text-green-700 uppercase">
            검색 결과
          </div>
        )}

        {!trimmed ? (
          <p className="mt-3 text-sm text-sub">찾으시는 물건 이름을 입력해 주세요.</p>
        ) : isLoading ? (
          <p className="mt-3 text-sm text-sub">검색 중...</p>
        ) : isError ? (
          <p className="mt-3 text-sm text-sub">검색 중 오류가 발생했어요. 다시 시도해 주세요.</p>
        ) : results.length === 0 ? (
          <p className="mt-3 text-sm text-sub">일치하는 품목이 없어요.</p>
        ) : (
          <ul className="mt-3">
            {results.map((item) => (
              <li key={item.id} className="border-t border-line first:border-t-0">
                <Link
                  to={`/result/${item.id}`}
                  className="flex items-center justify-between py-3 text-[13.5px] font-bold text-ink"
                >
                  {item.name}
                  <span className="text-green-700">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
