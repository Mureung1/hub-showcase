import { StarIcon } from './icons.jsx';

// 지도 화면 좌측 사이드바 맨 위, 검색/필터보다 먼저 보이는 자리에 두는 가로 스크롤 캐러셀.
// "대전시민도 몰랐던 빵집을 알리자"는 목적이라 발견성이 제일 높은 위치에 배치 — 검색/카테고리
// 필터링과 무관하게 항상 노출된다(필터 토글이나 추천 알고리즘에는 일부러 안 끼워 넣음, 오버엔지니어링 방지).
export default function OperatorPicks({ bakeries, onSelect }) {
  const picks = bakeries.filter((b) => b.isFeatured);
  if (picks.length === 0) return null;

  return (
    <div className="operator-picks">
      <div className="operator-picks-title">
        <StarIcon style={{ width: 13, height: 13 }} />
        운영자 추천
      </div>
      <div className="operator-picks-scroll">
        {picks.map((b) => (
          <button type="button" className="operator-pick-card" key={b.id} onClick={() => onSelect(b.id)}>
            <span className="operator-pick-thumb">
              {b.photoUrl ? <img src={b.photoUrl} alt="" /> : '🥐'}
            </span>
            <span className="operator-pick-name">{b.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
