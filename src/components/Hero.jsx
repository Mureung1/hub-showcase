function Hero({ onOpenRecommendation }) {
  return (
    <section className="hero" id="home">
      <div className="hero-blob hero-blob-one" />
      <div className="hero-blob hero-blob-two" />

      <div className="hero-inner page-width">
        <div className="hero-copy">
          <span className="eyebrow">우리 학교 AI 공동구매 카트</span>
          <h1>
            1인분 필요할 땐,
            <br />
            <strong>AI가 딱 맞는 카트</strong>를
            <br />
            채워줘요
          </h1>
          <p>
            필요한 상품을 검색하면 AI가 현재 진행 중인 공동구매를 먼저 찾아드려요.
            추천된 공동구매에 바로 참여하고, 적합한 모집이 없다면 새로운 공동구매를 만들 수 있습니다.
          </p>

          <div className="hero-buttons">
            <a className="button button-primary" href="#group-buys">
              공동구매 둘러보기
            </a>
            <button className="button button-ghost" type="button" onClick={onOpenRecommendation}>
              AI 추천 받아보기 →
            </button>
          </div>

          <div className="hero-stats">
            <div><strong>2,480+</strong><span>이번 학기 참여 학생</span></div>
            <div><strong>92%</strong><span>배송비 절약 성공률</span></div>
            <div><strong>36곳</strong><span>추천 수령 장소</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="공동구매 카트 일러스트">
          <span className="live-sticker">🔥 지금 4명이 함께 담는 중</span>
          <div className="cart-illustration">
            <span className="item item-one">🧴</span>
            <span className="item item-two">🍪</span>
            <span className="item item-three">🧻</span>
            <div className="cart-basket">🛒</div>
            <span className="student student-one">🧑‍🎓</span>
            <span className="student student-two">👩‍🎓</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
