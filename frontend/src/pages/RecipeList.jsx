import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import RecipeCard from '../components/RecipeCard';

const CAN_MAKE_CHIPS = [
  { v: 'full', label: '✅ 100% 바로 가능' },
  { v: 'few',  label: '🧂 재료 몇개만 더 (핵심 재료 OK)' },
];

// GET /api/recipes?level= 에 전달되는 값 — calculateRecipeDifficulty()가 실제로 매기는 값과 맞춰야 한다.
// - 'all'      : 전체
// - 'beginner' : 초보자
// - 'mid'      : 중급자
// - 'expert'   : 상급자 (예전엔 'high'였는데 실제 계산 결과와 안 맞아 필터가 항상 0건이었음)
const LEVEL_CHIPS = [
  { v: 'all',      label: '난이도 전체' },
  { v: 'beginner', label: '🟢 초보자' },
  { v: 'mid',      label: '🟡 중급자' },
  { v: 'expert',   label: '🔴 상급자' },
];

const CATEGORY_CHIPS = [
  { v: 'all', label: '전체메뉴' },
  { v: '반찬', label: '반찬' },
  { v: '국&찌개', label: '국&찌개' },
  { v: '일품', label: '일품' },
  { v: '밥/죽/스프', label: '밥/죽/스프' },
  { v: '후식', label: '디저트' },
];

// 'default'(DB 순서)는 "내 냉장고로 요리" 탭처럼 filter=full이라 전부 100% 보유율일 때 기본값 —
// 그 경우 추천순으로 정렬해봐야 순서가 안 바뀐다. 정렬 드롭다운은 "전체 둘러보기" 탭에서만 의미가 있다.
const SORT_OPTIONS = [
  { v: 'default', label: '기본순' },
  { v: 'ratio',   label: '추천순(보유율)' },
  { v: 'time',    label: '조리시간 짧은순' },
  { v: 'level',   label: '난이도 낮은순' },
];

export default function RecipeList() {
  const { fridge, openRecipeDetail, tab, go } = useApp();
  const [viewMode, setViewMode] = useState('can-make'); // 'can-make' | 'browse'
  const [match, setMatch] = useState('full');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('default');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(''); // query를 300ms 디바운스한 실제 검색어
  const [page, setPage] = useState(1);
  const [recipes, setRecipes] = useState({ items: [], total: 0, totalPages: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [status, setStatus] = useState('loading'); // 1페이지(필터 변경) 요청의 loading/ready/error
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const sentinelRef = useRef(null);

  // 뷰 모드가 변경될 때 필터 상태 동기화
  useEffect(() => {
    if (viewMode === 'can-make') {
      setMatch('full');
      setCategory('all');
      setSort('default');
    } else {
      setMatch('all');
    }
  }, [viewMode]);

  // 타이핑마다 요청을 쏘면 6만+ 레시피를 매 키 입력마다 서버에서 필터링하게 된다 — 300ms 안에
  // 다음 입력이 없을 때만 실제 검색어(search)를 갱신해 요청 빈도를 줄인다.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 냉장고/필터가 바뀌면 누적된 목록을 버리고 1페이지부터 새로 받는다 — 그대로 두면 "더보기"로
  // 쌓은 뒤 페이지가 그대로인 채 필터만 바뀌었을 때 옛 페이지 데이터 위에 새 페이지가 겹쳐 쌓인다.
  useEffect(() => { setPage(1); }, [fridge, match, level, category, search, sort]);

  useEffect(() => {
    if (!Object.keys(fridge).length) return;
    if (page === 1) { setStatus('loading'); setError(null); }
    else { setLoadingMore(true); setLoadMoreError(false); }
    api.getRecipes({ filter: match, level, category, search, sort, page })
      .then((r) => {
        setRecipes((prev) => (page === 1 ? r : { ...r, items: [...prev.items, ...r.items] }));
        if (page === 1) setStatus('ready');
        setLoadingMore(false);
      })
      .catch((err) => {
        if (page === 1) { setStatus('error'); setError(err?.message || '레시피를 불러오지 못했어요'); }
        else { setLoadMoreError(true); }
        setLoadingMore(false);
      });
  }, [fridge, match, level, category, search, sort, page, retryTick]);

  // 무한 스크롤 — 목록 맨 아래 sentinel이 화면에 들어오면 다음 페이지를 이어붙인다.
  // loadingMore로 막아두지 않으면 응답이 늦게 오는 동안 sentinel이 계속 보여서 page가 중복 증가한다.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || recipes.page >= recipes.totalPages) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore) setPage((p) => p + 1);
    }, { rootMargin: '300px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadingMore, recipes.page, recipes.totalPages]);

  return (
    <section className="screen active">
      <div className="appbar"><h1>레시피</h1></div>
      <div className="content">
        <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <div 
            style={{ flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 15, fontWeight: viewMode === 'can-make' ? 800 : 500, borderBottom: viewMode === 'can-make' ? '3px solid var(--green-dark)' : 'none', color: viewMode === 'can-make' ? 'var(--green-dark)' : 'var(--sub)', cursor: 'pointer' }}
            onClick={() => setViewMode('can-make')}
          >내 냉장고로 요리</div>
          <div 
            style={{ flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 15, fontWeight: viewMode === 'browse' ? 800 : 500, borderBottom: viewMode === 'browse' ? '3px solid var(--green-dark)' : 'none', color: viewMode === 'browse' ? 'var(--green-dark)' : 'var(--sub)', cursor: 'pointer' }}
            onClick={() => setViewMode('browse')}
          >전체 둘러보기</div>
        </div>

        <div style={{ padding: '0 0 12px' }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 요리 이름으로 검색 (예: 김치찌개)"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 15, background: 'var(--bg-card)', color: 'var(--text)', boxSizing: 'border-box' }}
          />
        </div>

        {viewMode === 'can-make' && (
          <div className="chips" style={{ marginBottom: 12 }}>
            {CAN_MAKE_CHIPS.map((c) => (
              <span key={c.v} className={`chip${match === c.v ? ' on' : ''}`} onClick={() => setMatch(c.v)}>{c.label}</span>
            ))}
          </div>
        )}

        {viewMode === 'browse' && (
          <>
            <div className="chips" style={{ marginBottom: 6, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4 }}>
              {CATEGORY_CHIPS.map((c) => (
                <span key={c.v} className={`chip${category === c.v ? ' on' : ''}`} onClick={() => setCategory(c.v)}>{c.label}</span>
              ))}
            </div>
            <div className="chips" style={{ marginBottom: 12 }}>
              {LEVEL_CHIPS.map((c) => (
                <span key={c.v} className={`chip${level === c.v ? ' on' : ''}`} onClick={() => setLevel(c.v)}>{c.label}</span>
              ))}
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text)' }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: '#e5484d' }}>{error}</p>
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setRetryTick((t) => t + 1)}>다시 시도</button>
          </div>
        )}

        {status !== 'error' && (
          <>
        {viewMode === 'can-make' && (
          <div className="notice" style={{ marginTop: 0 }}>🔥 임박 재료를 쓰는 요리 우선 · <b>{recipes.total}</b>개 레시피</div>
        )}
        {viewMode === 'browse' && (
          <div className="notice" style={{ marginTop: 0 }}><b>{recipes.total}</b>개 레시피</div>
        )}

        <div>
          {recipes.items.map((r) => (
            <RecipeCard key={r.id} recipe={r} matchPct={Math.round((r.have / r.total) * 100)}
              extra={r.full
                ? <div className="meta" style={{ marginTop: 4, color: 'var(--green-dark)', fontWeight: 700 }}>재료 {r.have}/{r.total} 보유 — 바로 가능</div>
                : <div className="meta" style={{ marginTop: 4 }}>재료 {r.have}/{r.total} 보유 · {r.missing.map(m => typeof m === 'object' ? (m.name || m.id || JSON.stringify(m)) : m).join(', ')} 부족 (선택 재료)</div>}
              onClick={() => openRecipeDetail(r.id)} />
          ))}
        </div>

        {recipes.page < recipes.totalPages && (
          // sentinelRef가 화면에 들어오면 IntersectionObserver가 자동으로 다음 페이지를 불러오지만,
          // 이 기기/브라우저에서 IntersectionObserver가 어떤 이유로든 안 붙는 경우의 안전망으로
          // 버튼도 항상 같이 둔다 — 로딩 중엔 버튼 대신 로딩 문구만 보여준다.
          <div ref={sentinelRef} style={{ padding: '16px 0' }}>
            {loadMoreError ? (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: '#e5484d' }}>더 불러오지 못했어요 · </span>
                <a style={{ fontSize: 13, color: 'var(--green-dark)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setRetryTick((t) => t + 1)}>다시 시도</a>
              </div>
            ) : loadingMore ? (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--sub)' }}>불러오는 중… ({recipes.items.length}/{recipes.total})</span>
              </div>
            ) : (
              <button className="btn ghost" style={{ width: '100%' }} onClick={() => setPage((p) => p + 1)}>
                더보기 ({recipes.items.length}/{recipes.total})
              </button>
            )}
          </div>
        )}

        {recipes.total > 0 && (
          <div className="notice" style={{ marginTop: 4 }}>
            원하는 요리가 없다면 재료를 더 채워보세요 ·{' '}
            <a style={{ color: 'var(--green-dark)', fontWeight: 700, cursor: 'pointer' }} onClick={() => tab('shopping-sets')}>장보기 세트 보기 ›</a>
          </div>
        )}

        {status === 'ready' && recipes.total === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <div style={{ fontSize: 40 }}>🤔</div>
            <p style={{ fontSize: 14.5, fontWeight: 800, marginTop: 10 }}>조건에 맞는 레시피가 없어요</p>
            <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 6 }}>필터를 바꾸거나, 한 주 식단을 통째로 받아보세요</p>
            <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => go('meal-plan-picker')}>📅 일주일 식단 루틴 보기</button>
          </div>
        )}
          </>
        )}
      </div>
    </section>
  );
}
