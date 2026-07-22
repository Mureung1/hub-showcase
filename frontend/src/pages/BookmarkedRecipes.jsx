import { useApp } from '../context/AppContext';
import { api } from '../api';
import { useAsyncData } from '../hooks/useAsyncData';
import RecipeCard from '../components/RecipeCard';

export default function BookmarkedRecipes() {
  const { back, bookmarkedIds, openRecipeDetail } = useApp();

  // 찜 목록은 id만 로컬에 저장돼 있으니, 상세 정보는 매번 서버에서 받아온다.
  // 시딩/정리 과정에서 삭제된 레시피 id가 남아있을 수 있어 실패한 항목은 조용히 건너뛴다.
  const { status, data, error, refetch } = useAsyncData(async () => {
    const results = await Promise.all(
      bookmarkedIds.map((id) => api.getRecipeDetail(id).catch(() => null)),
    );
    return results.filter(Boolean);
  }, [bookmarkedIds]);

  const recipes = data || [];

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>찜한 레시피</h1></div>
      <div className="content">
        {status === 'loading' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--sub)' }}>불러오는 중…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: '#e5484d' }}>{error}</p>
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={refetch}>다시 시도</button>
          </div>
        )}

        {status === 'ready' && recipes.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <div style={{ fontSize: 40 }}>🤍</div>
            <p style={{ fontSize: 14.5, fontWeight: 800, marginTop: 10 }}>찜한 레시피가 없어요</p>
            <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 6 }}>레시피 상세 화면에서 하트를 눌러 찜해보세요</p>
          </div>
        )}

        {status === 'ready' && recipes.map((r) => {
          const have = r.ingredients.filter((ing) => ing.have).length;
          const total = r.ingredients.length;
          return (
            <RecipeCard
              key={r.id}
              recipe={{ ...r, total }}
              matchPct={total ? Math.round((have / total) * 100) : 0}
              extra={<div className="meta" style={{ marginTop: 4 }}>재료 {have}/{total} 보유</div>}
              onClick={() => openRecipeDetail(r.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
