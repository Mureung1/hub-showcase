import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './FavoriteStoresPage.css'

/*
 * M1 관심 가게 (T-12). 가게를 검색해 즐겨찾기로 등록한다.
 * 즐겨찾기는 알림 대상 판정(T-11)의 조건 중 하나 — 등록 즉시 판정에 반영된다.
 */
function FavoriteStoresPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async (q = '') => {
    try {
      const res = await api.get('/stores', { params: q ? { q } : {} })
      setStores(res.data)
    } catch (err) {
      setError(err.response?.data?.message ?? '가게를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const search = (e) => {
    e.preventDefault()
    setLoading(true)
    load(keyword)
  }

  const toggle = async (store) => {
    // 낙관적 갱신 — 실패하면 되돌린다
    setStores((prev) =>
      prev.map((s) => (s.id === store.id ? { ...s, isFavorite: !s.isFavorite } : s)),
    )
    try {
      if (store.isFavorite) {
        await api.delete(`/favorites/${store.id}`)
      } else {
        await api.post('/favorites', { storeId: store.id })
      }
    } catch {
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, isFavorite: store.isFavorite } : s)),
      )
    }
  }

  return (
    <main className="fav">
      <button type="button" className="fav__back" onClick={() => navigate('/app')}>
        ← 목록
      </button>
      <h1 className="fav__title">관심 가게</h1>
      <p className="fav__sub">즐겨찾기한 가게가 마감 할인을 등록하면 알림을 받아요.</p>

      <form className="fav__search" onSubmit={search}>
        <input
          className="fav__input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="가게 이름 검색"
        />
        <button className="fav__search-btn" type="submit">
          검색
        </button>
      </form>

      {loading && <p className="fav__msg">불러오는 중...</p>}
      {error && <p className="fav__msg fav__msg--error">{error}</p>}
      {!loading && !error && stores.length === 0 && <p className="fav__msg">검색 결과가 없어요.</p>}

      <ul className="fav__list">
        {stores.map((s) => (
          <li key={s.id} className="fav__item">
            <div className="fav__info">
              <b>{s.name}</b>
              <span>
                {s.category} · {s.address}
              </span>
            </div>
            <button
              type="button"
              className={`fav__toggle${s.isFavorite ? ' fav__toggle--on' : ''}`}
              onClick={() => toggle(s)}
            >
              {s.isFavorite ? '관심 해제' : '관심 등록'}
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default FavoriteStoresPage
