import { useState, useEffect } from 'react'
import './InterestSection.css'

// 관심 공고 CRUD — 화면↔서버↔DB 한 바퀴의 프론트 쪽.
//  useEffect로 목록 로드, fetch로 추가(POST)·삭제(DELETE) 후 목록 갱신.
export default function InterestSection() {
  const [items, setItems] = useState([])
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jd, setJd] = useState('') // 공고 내용(JD) — 나중에 AI 갭 분석의 입력
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 목록 불러오기 (Read)
  async function load() {
    try {
      const res = await fetch('/api/interests')
      if (!res.ok) throw new Error('목록 조회 실패')
      setItems(await res.json())
      setError('')
    } catch (e) {
      setError('서버 연결 실패 — Express(3000) 켜졌는지 확인')
    } finally {
      setLoading(false)
    }
  }

  // 마운트 시 1회 로드
  useEffect(() => {
    load()
  }, [])

  // 추가 (Create)
  async function add(e) {
    e.preventDefault()
    if (!company.trim() || !role.trim()) return
    const res = await fetch('/api/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, role, jd }),
    })
    if (res.ok) {
      setCompany('')
      setRole('')
      setJd('') // jd 입력칸도 비우기
      load() // 저장 후 목록 다시 불러와 화면 갱신
    }
  }

  // 삭제 (Delete)
  async function remove(id) {
    const res = await fetch(`/api/interests/${id}`, { method: 'DELETE' })
    if (res.ok) setItems((prev) => prev.filter((it) => it.id !== id))
  }

  return (
    <section className="interest panel">
      <div className="interest-head">
        <span className="interest-title">⭐ 관심 공고</span>
        <span className="interest-sub">추가하면 서버에 저장 · (Supabase 연동 후) 새로고침해도 남음</span>
      </div>

      <form className="interest-form" onSubmit={add}>
        <input
          className="interest-input"
          placeholder="회사명"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <input
          className="interest-input"
          placeholder="역할"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <button className="interest-add" type="submit">+ 추가</button>
        <textarea
          className="interest-jd"
          placeholder="공고 내용(JD)을 붙여넣기 — 나중에 AI가 이걸로 내 갭을 분석 (선택)"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
        />
      </form>

      {error && <div className="interest-error">⚠ {error}</div>}

      {loading ? (
        <div className="interest-empty">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="interest-empty">아직 없음 — 위에서 추가해봐</div>
      ) : (
        <ul className="interest-list">
          {items.map((it) => (
            <li key={it.id} className="interest-item">
              <span className="interest-co">{it.company}</span>
              <span className="interest-role">{it.role}</span>
              <span className="interest-date">{(it.created_at || '').slice(0, 10)}</span>
              <button className="interest-del" onClick={() => remove(it.id)} aria-label="삭제">✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
