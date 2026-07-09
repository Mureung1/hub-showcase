import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillTabs from '../components/PillTabs.jsx'
import MeetingCard from '../components/MeetingCard.jsx'
import { CATEGORIES, REGIONS } from '../data/mockData.js'
import { isListedByDefault } from '../utils/meetings.js'

const TYPE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'flash', label: '번개모임' },
  { value: 'small', label: '소모임' },
]

export default function MeetingListPage() {
  const { meetings } = useAppState()
  const [searchParams] = useSearchParams()

  const [type, setType] = useState(searchParams.get('type') ?? 'all')
  const [category, setCategory] = useState('전체')
  const [sido, setSido] = useState('전체')
  const [sigungu, setSigungu] = useState('전체')
  const [keyword, setKeyword] = useState('')

  const sigunguOptions = sido === '전체' ? [] : Object.keys(REGIONS[sido] ?? {})

  const filtered = useMemo(() => {
    return meetings
      .filter(isListedByDefault)
      .filter((m) => type === 'all' || m.type === type)
      .filter((m) => category === '전체' || m.category === category)
      .filter((m) => sido === '전체' || m.regionSido === sido)
      .filter((m) => sigungu === '전체' || m.regionSigungu === sigungu)
      .filter((m) => !keyword.trim() || m.title.includes(keyword.trim()) || m.description.includes(keyword.trim()))
      .sort((a, b) => (a.startAt < b.startAt ? 1 : -1))
  }, [meetings, type, category, sido, sigungu, keyword])

  return (
    <>
      <PageHeader title="모임 찾기" eyebrow="검색" />

      <Card variant="glass">
        <PillTabs options={TYPE_OPTIONS} value={type} onChange={setType} ariaLabel="모임 유형" />

        <input
          className="field-input"
          type="search"
          placeholder="제목이나 설명으로 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          aria-label="키워드 검색"
        />

        <div className="field-row field-row--three">
          <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="카테고리">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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

      <div className="eyebrow">{filtered.length}개의 모임</div>

      {filtered.length === 0 && (
        <Card variant="solid">
          <p style={{ color: 'var(--ink-mute)', fontSize: 13.5, textAlign: 'center' }}>
            조건에 맞는 모임이 없어요. 필터를 조정해보세요.
          </p>
        </Card>
      )}

      {filtered.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </>
  )
}
