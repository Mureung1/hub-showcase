import './BottomNav.css';

export default function BottomNav({ currentPage, onNavigate }) {
  const navItems = [
    { key: 'home', label: '홈', icon: 'home' },
    { key: 'postfeed', label: '게시글', icon: 'article' },
    { key: 'map', label: '지도', icon: 'map' },
    { key: 'chat', label: '채팅', icon: 'chat' },
    { key: 'mypage', label: '마이페이지', icon: 'person' },
  ];

  const handleNavClick = (e, key, label) => {
    e.preventDefault();
    if (key === 'home') {
      onNavigate('home');
    } else if (key === 'postfeed') {
      onNavigate('postfeed');
    } else if (key === 'mypage') {
      onNavigate('mypage');
    } else {
      alert(`'${label}' 서비스는 준비 중입니다.`);
    }
  };

  return (
    <nav className="td-bottom-nav">
      {navItems.map((item) => (
        <a
          key={item.key}
          className={`td-bottom-nav__item ${
            currentPage === item.key || (item.key === 'postfeed' && currentPage === 'createpost') ? 'td-bottom-nav__item--active' : ''
          }`}
          href={`#${item.key}`}
          onClick={(e) => handleNavClick(e, item.key, item.label)}
        >
          <span className="material-symbols-outlined">
            {item.icon}
          </span>
          <span className="td-bottom-nav__label">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
