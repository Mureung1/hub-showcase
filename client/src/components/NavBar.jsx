const NAV_ITEMS = [
  { key: 'home', label: '홈' },
  { key: 'basket', label: '수강 바구니' },
  { key: 'simulation', label: '시뮬레이션' },
  { key: 'chatbot', label: '챗봇' },
];

function NavBar({ activeTab, onNavigate }) {
  return (
    <nav className="nav-bar">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
          onClick={() => onNavigate(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export default NavBar;
