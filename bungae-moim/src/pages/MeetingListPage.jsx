import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillTabs from '../components/PillTabs.jsx'
import MeetingCard from '../components/MeetingCard.jsx'
import { CATEGORIES, REGIONS } from '../data/mockData.js'
import { fetchMeetings } from '../api/meetings.js'

const TYPE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'flash', label: '번개모임' },
  { value: 'small', label: '소모임' },
]

// '전체'/'all' 같은 UI 기본값은 서버에 필터로 보내지 않는다(값이 있으면 정확일치 필터라서).
function toFilterValue(value) {
  return value === '전체' || value === 'all' ? undefined : value
}

export default function MeetingListPage() {
  const [searchParams] = useSearchParams()

  const [type, setType] = useState(searchParams.get('type') ?? 'all')
  const [category, setCategory] = useState('전체')
  const [sido, setSido] = useState('전체')
  const [sigungu, setSigungu] = useState('전체')
  const [keyword, setKeyword] = useState('')

  // 키워드는 타이핑마다 서버를 때리지 않도록 잠깐 기다렸다 반영한다(디바운스).
  const [debouncedKeyword, setDebouncedKeyword] = useState('')

  const [items, setItems] = useState([])
  // 조건에 맞는 전체 건수. items는 한 페이지(20건)로 잘리므로 개수 표시에 items.length를
  // 쓰면 21건부터 실제보다 작게 나온다(명세서 GET /api/meetings 항목의 경고 그대로).
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const sigunguOptions = sido === '전체' ? [] : Object.keys(REGIONS[sido] ?? {})

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300)
    return () => clearTimeout(timer)
  }, [keyword])

  // 필터가 바뀔 때마다 서버에서 목록을 다시 받아온다. 빠르게 여러 번 바뀌면 응답이
  // 순서 뒤바뀌어 도착할 수 있으므로, 최신 요청의 결과만 반영한다(active 플래그).
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetchMeetings({
      type: toFilterValue(type),
      category: toFilterValue(category),
      regionSido: toFilterValue(sido),
      regionSigungu: toFilterValue(sigungu),
      keyword: debouncedKeyword,
    })
      .then((data) => {
        if (!active) return
        setItems(data.items)
        setTotal(data.total)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [type, category, sido, sigungu, debouncedKeyword])

  return (
    <div className="container--wide">
      <PageHeader title="모임 찾기" eyebrow="검색" />

      <div className="list-layout">
        <Card variant="glass" className="list-filter">
          <div className="list-filter-group">
            <span className="eyebrow">유형</span>
            <PillTabs options={TYPE_OPTIONS} value={type} onChange={setType} ariaLabel="모임 유형" />
          </div>

          <div className="list-filter-group">
            <span className="eyebrow">검색어</span>
            <input
              className="field-input"
              type="search"
              placeholder="제목이나 설명으로"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="키워드 검색"
            />
          </div>

          <div className="list-filter-group">
            <span className="eyebrow">카테고리</span>
            <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="카테고리">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="list-filter-group">
            <span className="eyebrow">지역</span>
            <select
              className="field-select"
              value={sido}
              onChange={(e) => {
                setSido(e.target.value)
                setSigungu('전체')
              }}
              aria-label="시/도"
            >
              <option value="전체">시/도 전체</option>
              {Object.keys(REGIONS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="field-select"
              value={sigungu}
              onChange={(e) => setSigungu(e.target.value)}
              aria-label="시/군/구"
              disabled={sido === '전체'}
            >
              <option value="전체">시/군/구 전체</option>
              {sigunguOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <div className="list-results">
          {loading && <div className="eyebrow">불러오는 중…</div>}

          {error && (
            <Card variant="solid">
              <p style={{ color: 'var(--warning)', fontSize: 13.5, textAlign: 'center' }}>{error}</p>
            </Card>
          )}

          {!loading && !error && (
            <>
              <div className="eyebrow">
                {total}개의 모임
                {total > items.length && ` · ${items.length}개 표시 중`}
              </div>

              {items.length === 0 && (
                <Card variant="solid">
                  <p style={{ color: 'var(--ink-mute)', fontSize: 13.5, textAlign: 'center' }}>
                    조건에 맞는 모임이 없어요. 필터를 조정해보세요.
                  </p>
                </Card>
              )}

              {items.length > 0 && (
                <div className="card-grid--3">
                  {items.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
