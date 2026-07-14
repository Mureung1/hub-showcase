function Header({ cartCount, onOpenCart, onOpenRecommendation }) {
  return (
    <header className="site-header">
      <div className="header-main page-width">
        <a className="brand" href="#home" aria-label="CampusCart 홈">
          <span className="brand-mark">🛒</span>
          <span>CampusCart</span>
        </a>

        <nav className="main-nav" aria-label="주요 메뉴">
          <a href="#home">홈</a>
          <a href="#group-buys">공동구매</a>
          <a href="#pickup">수령 장소</a>
          <button type="button" onClick={onOpenCart}>
            내 카트
          </button>
        </nav>

        <div className="header-actions">
          <button className="button button-ghost" type="button">
            로그인
          </button>
          <button className="button button-primary" type="button" onClick={onOpenRecommendation}>
            시작하기
          </button>
        </div>
      </div>

      <button className="floating-cart" type="button" onClick={onOpenCart} aria-label="내 카트 열기">
        🛒
        <span>{cartCount}</span>
      </button>
    </header>
  );
}

export default Header;
