// 첫 화면 히어로. 처음 온 사람에게 이 서비스가 뭔지 한눈에 알려준다(다크 퍼플 카드, 말 거는 문구).
// count(지금 모아둔 공고 수)와 updatedAt(마지막 수집 시각)으로 신선도·규모를 함께 보여준다.

// "2026-07-23T..." -> "오늘 / 어제 / N일 전 업데이트"
function freshness(updatedAt) {
  if (!updatedAt) return null;
  const days = Math.floor((Date.now() - new Date(updatedAt)) / 86400000);
  if (days <= 0) return "오늘 업데이트";
  if (days === 1) return "어제 업데이트";
  return `${days}일 전 업데이트`;
}

export default function Hero({ count, updatedAt }) {
  const fresh = freshness(updatedAt);
  return (
    <section className="hero">
      <div className="hero-text">
        <h1 className="hero-title">내 조건에 맞는 대외활동만 골라줄게</h1>
        <p className="hero-sub">
          대외활동·공모전·장학 공고를 여러 곳에서 다 모았어. 조건만 넣어주면 지원할 수 있는 것만 위로 올려줄게.
        </p>
        <div className="hero-meta">
          {count > 0 && <span className="hero-badge">지금 {count.toLocaleString()}개 공고</span>}
          {fresh && <span className="hero-fresh">{fresh}</span>}
        </div>
      </div>
    </section>
  );
}
