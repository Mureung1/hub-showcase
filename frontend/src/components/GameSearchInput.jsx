import { useEffect, useRef, useState } from 'react'
import { searchGames } from '../lib/storage.js'

// 역기획 "대상 게임" 입력용 자동완성. RAWG 검색 결과를 드롭다운으로 보여주고,
// 고르면 onPick(game)으로 게임 메타(장르 등)를 부모에 넘긴다. (키는 백엔드에만.)
function GameSearchInput({ value, onChange, onPick, placeholder, ariaLabel }) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef(null)
  const skipRef = useRef(false) // 선택 직후 그 값으로 재검색되는 걸 막는다

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false
      return
    }
    const q = value.trim()
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const r = await searchGames(q)
        setResults(r)
        setOpen(r.length > 0)
        setActive(-1)
      } catch {
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function pick(g) {
    skipRef.current = true
    onChange(g.name)
    onPick(g)
    setOpen(false)
    setResults([])
  }

  function onKeyDown(e) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="rs-gamesearch" ref={boxRef}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {loading && <span className="rs-gamesearch-loading">검색 중…</span>}
      {open && (
        <ul className="rs-gamesearch-list" role="listbox">
          {results.map((g, i) => (
            <li
              key={g.id}
              role="option"
              aria-selected={i === active}
              className={`rs-gamesearch-item${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(g)
              }}
            >
              {g.coverUrl && (
                <img src={g.coverUrl} alt="" className="rs-gamesearch-cover" loading="lazy" />
              )}
              <span className="rs-gamesearch-name">
                {g.name}
                {g.released && <span className="rs-gamesearch-year"> · {g.released}</span>}
              </span>
              {g.platforms?.length > 0 && (
                <span className="rs-gamesearch-plat">{g.platforms.join(' · ')}</span>
              )}
            </li>
          ))}
          <li className="rs-gamesearch-credit" aria-hidden="true">
            게임 데이터 · Powered by RAWG
          </li>
        </ul>
      )}
    </div>
  )
}

export default GameSearchInput
