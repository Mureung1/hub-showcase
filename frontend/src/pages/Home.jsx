import { useApp } from '../context/AppContext';
import { api } from '../api';
import { fridgeAvailable, imminentIds } from '../logic/fridgeLogic';
import { useAsyncData } from '../hooks/useAsyncData';
import Row from '../components/Row';
import RecipeCard from '../components/RecipeCard';

export default function Home() {
  const { fridge, go, tab, openRecipeDetail } = useApp();

  // "지금 가능한 요리" 개수와 "오늘의 추천 레시피" 2개는 전체 레시피(6만+)를 다 받아와서 화면에서
  // 세고 정렬하던 걸, 서버가 계산한 total(정확한 개수)과 sort=ratio(매칭률 상위 정렬)로 대체 —
  // 필요한 숫자 하나와 카드 2개만 오가면 되니 응답이 훨씬 가벼워진다.
  const { status, data, refetch } = useAsyncData(async () => {
    if (!Object.keys(fridge).length) return null; // fridge 초기 로딩 전엔 아직 조회할 게 없음
    const [readyRes, topRes] = await Promise.all([
      api.getRecipes({ filter: 'full', pageSize: 1 }),
      api.getRecipes({ filter: 'all', sort: 'ratio', pageSize: 2 }),
    ]);
    return { ready: readyRes.total, topRecipes: topRes.items };
  }, [fridge]);
  const ready = data?.ready ?? 0;
  const topRecipes = data?.topRecipes ?? [];

  const total = Object.keys(fridge).filter((id) => fridgeAvailable(fridge, id)).length;
  const imminent = imminentIds(fridge);

  return (
    <section className="screen active">
      <div className="appbar"><h1>🥬 냉장고 레시피</h1></div>
      <div className="content">
        <div className="hero">
          <h2>🧊 오늘의 냉장고</h2>
          <p>재료 현황과 지금 가능한 요리를 한눈에</p>
          <div className="stats">
            <div className="stat"><b>{total}</b><span>보유 재료</span></div>
            <div className="stat"><b>{imminent.length}</b><span>유통기한 임박</span></div>
            <div className="stat"><b>{ready}</b><span>지금 가능한 요리</span></div>
          </div>
        </div>

        {ready < 3 ? (
          <div className="banner" onClick={() => go('shopping-sets')}>
            <span>🛒</span>
            <span className="txt">냉장고 재료가 부족해요! 추천 장보기 세트를 확인해 보세요</span>
            <span className="arrow">›</span>
          </div>
        ) : (
          <div className="banner" onClick={() => go('shopping-sets')}>
            <span>🛒</span>
            <span className="txt">추천 장보기 세트 · 일주일 식단 미리 계획해 보세요</span>
            <span className="arrow">›</span>
          </div>
        )}

        <div className="section-title">유통기한 임박 재료 <a onClick={() => go('expiry-alerts')}>전체보기 ›</a></div>
        <div>
          {imminent.length ? imminent.map((id) => {
            const f = fridge[id];
            return (
              <Row key={id} emoji={f.emoji} name={f.name} meta={`${f.qtyLabel} · 냉장`}
                right={<span className="badge red">{f.expiry}</span>} onClick={() => tab('fridge')} />
            );
          }) : <p style={{ fontSize: 13, color: 'var(--sub)' }}>임박한 재료가 없어요 👍</p>}
        </div>

        <div className="section-title">오늘의 추천 레시피 <a onClick={() => tab('recipe-list')}>전체보기 ›</a></div>
        {status === 'error' ? (
          <div className="notice">
            레시피를 불러오지 못했어요 ·{' '}
            <a style={{ color: 'var(--green-dark)', fontWeight: 700, cursor: 'pointer' }} onClick={refetch}>다시 시도</a>
          </div>
        ) : (
        <div>
          {topRecipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} matchPct={Math.round((r.have / r.total) * 100)}
              extra={r.full
                ? <div className="meta" style={{ marginTop: 4, color: 'var(--green-dark)', fontWeight: 700 }}>재료 {r.have}/{r.total} 보유 — 지금 바로 가능</div>
                : <div className="meta" style={{ marginTop: 4 }}>재료 {r.have}/{r.total} 보유</div>}
              onClick={() => openRecipeDetail(r.id)} />
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
