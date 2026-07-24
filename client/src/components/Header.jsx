import { useLocation } from 'react-router-dom';
import NavBar from './NavBar';
import './Header.css';

// 홈("/")에서는 히어로 사진 위에 얹히는 투명 헤더로, 그 외 페이지에서는
// 일반 라이트 톤 헤더로 렌더링된다 — 페이지가 늘어나도 이 판단은 여기 한 곳에만 있으면 된다.
function Header() {
  const { pathname } = useLocation();
  const isHero = pathname === '/';

  return (
    <header className={`site-header ${isHero ? 'site-header-hero' : ''}`}>
      <NavBar />
    </header>
  );
}

export default Header;
