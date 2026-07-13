import { useState } from 'react'
import PageHeader from '../components/PageHeader'

interface MockItem {
  id: string
  name: string
}

// TODO(Day 2): replace with GET /api/items/search?q= via TanStack Query
const MOCK_ITEMS: MockItem[] = [
  { id: '1', name: '건전지' },
  { id: '2', name: '우산' },
  { id: '3', name: '종이팩' },
  { id: '4', name: '아이스팩' },
  { id: '5', name: '커피컵' },
  { id: '6', name: '영수증' },
  { id: '7', name: '플라스틱 음료병' },
  { id: '8', name: '형광등' },
]

export default function SearchPage() {
  const [query, setQuery] = useState('')

  const trimmed = query.trim()
  const results = trimmed
    ? MOCK_ITEMS.filter((item) => item.name.includes(trimmed))
    : MOCK_ITEMS

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

        <div className="mt-6 text-xs font-extrabold tracking-wider text-green-700 uppercase">
          {trimmed ? '검색 결과' : '자주 검색한 항목'}
        </div>

        {results.length === 0 ? (
          <p className="mt-3 text-sm text-sub">일치하는 품목이 없어요.</p>
        ) : (
          <ul className="mt-3">
            {results.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border-t border-line py-3 text-[13.5px] font-bold text-ink first:border-t-0"
              >
                {item.name}
                <span className="text-green-700">›</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
