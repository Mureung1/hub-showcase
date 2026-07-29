import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './FavoriteStoresPage.css'

/*
 * M1 관심 가게 (T-12). 즐겨찾기는 알림 대상 판정(T-11)의 조건 중 하나다.
 *
 * 화면을 "내 관심 가게"와 "가게 찾기" 두 영역으로 나눈다.
 * 예전에는 진입하자마자 전체 가게 목록을 뿌렸는데, '관심 가게'라는 제목 아래
 * 새로 등록된 가게가 나타나니 자동 등록된 것으로 읽혔다.
 * 등록된 것과 후보를 눈으로 구분할 수 있어야 한다.
 */
function FavoriteStoresPage() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState(null) // null = 아직 검색 안 함
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)

  const loadFavorites = useCallback(async () => {
    try {
      const res = await api.get('/favorites')
      setFavorites(res.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message ?? '관심 가게를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  const search = async (e) => {
    e.preventDefault()
    setSearching(true)
    try {
      const res = await api.get('/stores', { params: keyword.trim() ? { q: keyword.trim() } : {} })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.message ?? '가게를 불러오지 못했습니다.')
    } finally {
      setSearching(false)
    }
  }

  /*
   * 낙관적 갱신 — 검색 결과의 버튼 상태를 즉시 바꾸고, 실패하면 되돌린다.
   * 성공하면 위쪽 관심 목록도 다시 불러 두 영역이 어긋나지 않게 한다.
   */
  const toggle = async (store) => {
    const next = !store.isFavorite
    setResults((prev) =>
      prev ? prev.map((s) => (s.id === store.id ? { ...s, isFavorite: next } : s)) : prev,
    )
    try {
      if (store.isFavorite) {
        await api.delete(`/favorites/${store.id}`)
      } else {
        await api.post('/favorites', { storeId: store.id })
      }
      await loadFavorites()
    } catch {
      setResults((prev) =>
        prev
          ? prev.map((s) => (s.id === store.id ? { ...s, isFavorite: store.isFavorite } : s))
          : prev,
      )
    }
  }

  const removeFromFavorites = async (store) => {
    setFavorites((prev) => prev.filter((s) => s.id !== store.id))
    try {
      await api.delete(`/favorites/${store.id}`)
      // 검색 결과에도 같은 가게가 떠 있으면 버튼 상태를 맞춘다
      setResults((prev) =>
        prev ? prev.map((s) => (s.id === store.id ? { ...s, isFavorite: false } : s)) : prev,
      )
    } catch {
      loadFavorites()
    }
  }

  return (
    <main className="fav">
      <button type="button" className="fav__back" onClick={() => navigate('/app')}>
        ← 목록
      </button>
      <h1 className="fav__title">관심 가게</h1>
      <p className="fav__sub">즐겨찾기한 가게가 마감 할인을 등록하면 알림을 받아요.</p>

      {error && <p className="fav__msg fav__msg--error">{error}</p>}

      <section className="fav__section">
        <h2 className="fav__heading">
          내 관심 가게 <b className="fav__count">{favorites.length}</b>
        </h2>

        {loading ? (
          <p className="fav__msg">불러오는 중...</p>
        ) : favorites.length === 0 ? (
          <p className="fav__msg">아직 등록한 가게가 없어요. 아래에서 가게를 찾아 등록해보세요.</p>
        ) : (
          <ul className="fav__list">
            {favorites.map((s) => (
              <li key={s.id} className="fav__item">
                <div className="fav__info">
                  <b>{s.name}</b>
                  <span>
                    {s.category} · {s.address}
                  </span>
                </div>
                <button
                  type="button"
                  className="fav__toggle fav__toggle--on"
                  onClick={() => removeFromFavorites(s)}
                >
                  관심 해제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fav__section">
        <h2 className="fav__heading">가게 찾기</h2>

        <form className="fav__search" onSubmit={search}>
          <input
            className="fav__input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="가게 이름 검색 (비우면 전체)"
          />
          <button className="fav__search-btn" type="submit" disabled={searching}>
            {searching ? '검색 중' : '검색'}
          </button>
        </form>

        {results === null ? (
          <p className="fav__msg">검색하면 결과가 여기에 나와요.</p>
        ) : results.length === 0 ? (
          <p className="fav__msg">검색 결과가 없어요.</p>
        ) : (
          <ul className="fav__list">
            {results.map((s) => (
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
        )}
      </section>
    </main>
  )
}

export default FavoriteStoresPage
