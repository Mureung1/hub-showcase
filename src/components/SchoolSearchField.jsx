import { useEffect, useState } from 'react'
import { searchSchools } from '../lib/schoolMeal.js'
import { colors, radius, spacing, font, styles } from '../styles/theme.js'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

// 학교명 입력 — 타이핑 멈춘 뒤 300ms 후 자동 검색한다. 이전 미완료 요청은 AbortController로
// 취소해, 늦게 도착한 응답이 그 사이 바뀐 최신 검색어의 결과를 덮어쓰는 레이스를 막는다.
export default function SchoolSearchField({ onSelect }) {
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState('idle') // idle | loading | results | empty | error
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setPhase('idle')
      setResults([])
      return
    }

    const controller = new AbortController()
    setPhase('loading')

    const timer = setTimeout(async () => {
      try {
        const schools = await searchSchools(trimmed, controller.signal)
        setResults(schools)
        setPhase(schools.length === 0 ? 'empty' : 'results')
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message || '학교 검색에 실패했어요.')
        setPhase('error')
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function handleSelect(school) {
    onSelect(school)
    setQuery('')
    setResults([])
    setPhase('idle')
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="학교명 검색 (예: 양서고등학교)"
        style={styles.input}
      />
      {phase === 'loading' && <p style={styles.helperText}>검색 중...</p>}
      {phase === 'error' && <p style={styles.errorText}>{error}</p>}
      {phase === 'empty' && <p style={styles.errorText}>검색 결과가 없어요. 학교명을 다시 확인해주세요.</p>}
      {phase === 'results' &&
        results.map((s) => (
          <button
            key={`${s.officeCode}-${s.schoolCode}`}
            type="button"
            className="tds-press"
            onClick={() => handleSelect(s)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: spacing.md,
              marginTop: spacing.sm,
              borderRadius: radius.sm,
              border: `1px solid ${colors.border}`,
              background: '#fff',
              cursor: 'pointer',
              fontSize: font.size.sm,
              color: colors.textStrong,
            }}
          >
            {s.name} <span style={{ color: colors.textSub }}>· {s.officeName} · {s.kind}</span>
          </button>
        ))}
    </div>
  )
}
