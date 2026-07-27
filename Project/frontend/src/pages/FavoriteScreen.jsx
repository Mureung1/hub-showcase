import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFavoriteGroupPurchases, removeFavoriteGroupPurchase } from '../api/groupPurchase';
import './FavoriteScreen.css';

const won = (value) => `${new Intl.NumberFormat('ko-KR').format(value || 0)}원`;

export default function FavoriteScreen({ onNavigate }) {
  const queryClient = useQueryClient();
  const hasToken = Boolean(localStorage.getItem('accessToken'));
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['favoriteGroupPurchases'],
    queryFn: getFavoriteGroupPurchases,
    enabled: hasToken,
  });
  const purchases = response?.data || [];

  async function handleRemove(id, event) {
    event.stopPropagation();
    await removeFavoriteGroupPurchase(id);
    queryClient.invalidateQueries({ queryKey: ['favoriteGroupPurchases'] });
  }

  if (!hasToken) return <main className="td-favorite-page"><h1>찜한 공동구매</h1><p>로그인 후 찜한 공동구매를 확인할 수 있어요.</p></main>;

  return (
    <main className="td-favorite-page">
      <header className="td-favorite-page__header"><div><p>내가 저장한 목록</p><h1>♥ 찜한 공동구매</h1></div><span>{purchases.length}개</span></header>
      {isLoading && <p>찜한 공동구매를 불러오는 중입니다.</p>}
      {error && <p>찜한 공동구매를 불러오지 못했습니다.</p>}
      {!isLoading && !error && purchases.length === 0 && <p className="td-favorite-page__empty">아직 찜한 공동구매가 없어요. 홈의 하트를 눌러 저장해 보세요.</p>}
      <section className="td-favorite-page__grid">
        {purchases.map((purchase) => (
          <article className="td-favorite-page__card" key={purchase.id} onClick={() => onNavigate('detail', purchase.id)}>
            <img src={purchase.imageUrl || purchase.imageUrls?.[0]} alt={purchase.title} />
            <button className="td-favorite-page__heart" aria-label="찜 해제" onClick={(event) => handleRemove(purchase.id, event)}>♥</button>
            <div className="td-favorite-page__card-body"><span>{purchase.status}</span><h2>{purchase.title}</h2><strong>{won(purchase.perPersonPrice)}</strong><p>{purchase.currentParticipants}/{purchase.targetParticipants}명 참여</p></div>
          </article>
        ))}
      </section>
    </main>
  );
}
