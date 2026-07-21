import { useOutletContext, useNavigate } from "react-router-dom";
import { matchActivity } from "../match";
import { daysLeft } from "../deadline";
import Card from "../components/Card";

// 즐겨찾기 화면. App이 가진 favorites로 별표한 공고만 모아 보여준다.
// 마감 지나도 목록에서 안 뺀다(카드에 "마감" 표시로 보여줌) - 상단 네비 즐겨찾기 개수와 여기 개수를 맞추려고.
export default function FavoritesPage() {
  const c = useOutletContext();
  const navigate = useNavigate();

  const items = c.postings
    .filter((a) => c.favorites.has(a.id))
    .map((a) => ({ ...a, ...matchActivity(a, c.matchProfile) }))
    .sort((x, y) => daysLeft(x.deadline) - daysLeft(y.deadline));

  return (
    <section className="results">
      <h2 className="page-title">즐겨찾기 {items.length > 0 ? items.length : ""}</h2>
      {items.length === 0 ? (
        <p className="empty">즐겨찾기한 공고가 없어요. 카드의 별(☆)을 눌러 담아보세요.</p>
      ) : (
        <div className="cards">
          {items.map((it) => (
            <Card key={it.id} item={it} fav={true} onToggleFav={() => c.toggleFav(it.id)} onOpen={() => navigate(`/activity/${it.id}`)} />
          ))}
        </div>
      )}
    </section>
  );
}
