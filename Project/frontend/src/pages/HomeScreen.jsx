import { useState } from 'react';
import './HomeScreen.css';

const initialPurchases = [
  {
    id: 1,
    category: '식자재',
    categoryIcon: 'eco',
    categoryType: 'primary',
    title: '양파 5kg 한 망 나눠요',
    price: 3500,
    currentParticipants: 3,
    targetParticipants: 5,
    distanceText: '도보 8분',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmzACAEWQoMTE7-vlQdE_JHrSn7P1pBbBEPbO10G4Dbe5MCoPLL0Xxg51k-faWq_CfF7V0xFFqnZUH9ciSUp7_Yc_BoLaVl2ZTvpEWPXU08YxbrX5Vgkwu7ugcElfMo52SrhfsOP8z2ZrUUkZy_tQb-MMBPemue9nglz_BjtRCbAFZZ2ve_DGO89qhcmmAvunPgyFwhiiw4v93-ZGQrG28Nrmr0uofGFxSpRpFXNFbbjKmkNSvqCs',
  },
  {
    id: 2,
    category: '식자재',
    categoryIcon: 'eco',
    categoryType: 'primary',
    title: '딸기 1박스 (2kg) 반반 나눌 분',
    price: 9000,
    currentParticipants: 1,
    targetParticipants: 2,
    distanceText: '도보 3분',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4h5hVaHcWJrtzDEBqTmFZXpmDp0BbhGAnoDBDj5p1AoFRHU9hEegoaKebpsymNIjkAPwd-bnA6iCZ66KOISi_uEQRJb5JWwJkbVB5dnZe6GllsDJLkbvmBHNolaVrgLESnUAbxT8E96hDsI1F8-NiLLLVTbTK7OINhpK0loqeYX02jPiIjelUwgRNRrStxq4nYWMaqRRjy4Z5-PdoyeMvpsGtsEC_WDLQuU4gH-KmoVshxsrTnX0',
  },
  {
    id: 3,
    category: '생필품',
    categoryIcon: 'local_mall',
    categoryType: 'secondary',
    title: '크리넥스 3겹 화장지 30롤 공구',
    price: 7500,
    currentParticipants: 2,
    targetParticipants: 3,
    distanceText: '도보 12분',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3Jgk1WL3bHM7C6vwAUT_s8auzkGNvqaZ1GMfzW7Lv0PhcOL2riiWQ_xvPzlchfF3MvcU1RBi9Eqqd3N0hj4G-yfIeSEMXh4dZkPRGT7AtdE4UU8yIehvP3ISAfTqxnAtnc3VIsVW6QzzA73JQ8mxZLq0U2171YNUHYdEz_FKoTo8Xm8anAcfRngm5zdfGzB5GEwL9z6lSIYs2Pp6OAP4nxvQBNMgJl-BAVGeE6WHuIA_wMNtJmYY',
  }
];

const categories = [
  { name: '전체', icon: 'grid_view' },
  { name: '식자재', icon: 'nutrition' },
  { name: '과일', icon: 'eco' },
  { name: '수산/정육', icon: 'set_meal' },
  { name: '밀키트', icon: 'restaurant' },
  { name: '베이커리', icon: 'bakery_dining' },
  { name: '유제품', icon: 'water_drop' },
  { name: '생필품', icon: 'local_mall' },
];

const won = (value) => `인당 ${new Intl.NumberFormat('ko-KR').format(value)}원`;

export default function HomeScreen({ onNavigate }) {
  const [purchases, setPurchases] = useState(initialPurchases);
  const [joinedItems, setJoinedItems] = useState({});
  const [activeCategory, setActiveCategory] = useState('전체');
  const [activeFilter, setActiveFilter] = useState('Distance');
  const [searchQuery, setSearchQuery] = useState('');

  const handleJoin = (id) => {
    if (joinedItems[id]) return; // already joined

    setPurchases(prevPurchases =>
      prevPurchases.map(item => {
        if (item.id === id && item.currentParticipants < item.targetParticipants) {
          return { ...item, currentParticipants: item.currentParticipants + 1 };
        }
        return item;
      })
    );
    setJoinedItems(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="td-root td-home-page">


      {/* Main Content */}
      <main className="td-home-page__content">
        
        {/* Hero Banner */}
        <section className="td-home-page__hero">
          <div className="td-home-page__hero-overlay"></div>
          <img 
            className="td-home-page__hero-bg" 
            alt="Fresh Organic Vegetables" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAb3yFBZaNb0sLZnbMxZ9ZZq0KwrEpfgZVjybbW8eOZuKUxet6cb8pJHncT28-PiKZHXbvGhbHbiL8RPNw68tJbxWw1uIsRpW75K2e_G4mxLN7aHgnrJmUK6BKX81HuwPwaB_Sox0v0o4yifqWbUguFBJtCr_cFqrVXy167ME-WwbO3c_a5Umuv11MEmEKm3-RlENVQrbAsSh62M7NIbDMmMdEb9_RiUMj-vyj5RCqNlLYVClDGjHU"
          />
          <div className="td-home-page__hero-body">
            <h1 className="td-headline-xl td-home-page__hero-title">동네 친구와 함께 신선함을 나눠요</h1>
            <p className="td-body-lg td-home-page__hero-subtitle">Order your Daily Groceries #Free Delivery</p>
            <div className="td-home-page__hero-search">
              <span className="material-symbols-outlined td-home-page__hero-search-icon">search</span>
              <input 
                className="td-home-page__hero-search-input" 
                placeholder="Search daily groceries..." 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="td-home-page__hero-search-btn">Search</button>
            </div>
          </div>
        </section>

        {/* Category Navigation */}
        <section className="td-home-page__categories-section">
          <div className="td-home-page__section-header-center">
            <h2 className="td-headline-md">Category</h2>
          </div>
          <div className="td-home-page__categories-list">
            {categories.map((cat) => (
              <div 
                className="td-home-page__category-item" 
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
              >
                <div className={`td-home-page__category-icon-wrapper ${activeCategory === cat.name ? 'td-home-page__category-icon-wrapper--active' : ''}`}>
                  <span className="material-symbols-outlined text-3xl">{cat.icon}</span>
                </div>
                <span className="td-label-sm td-home-page__category-label">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Section */}
        <section className="td-home-page__featured-section">
          <div className="td-home-page__featured-header">
            <h2 className="td-headline-md text-on-surface">내 주변 인기 공구</h2>
            <div className="td-home-page__filters">
              {['Distance', 'Deadline', 'Recent'].map((filter) => (
                <button 
                  key={filter} 
                  className={`td-home-page__filter-btn ${activeFilter === filter ? 'td-home-page__filter-btn--active' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="td-home-page__grid">
            {purchases
              .filter(item => activeCategory === '전체' || item.category === activeCategory)
              .map((item) => {
                const progress = (item.currentParticipants / item.targetParticipants) * 100;
                const isJoined = joinedItems[item.id];
                const isFull = item.currentParticipants >= item.targetParticipants;
                return (
                  <div 
                    className="td-home-page__card" 
                    key={item.id}
                    onClick={(e) => {
                      if (e.target.tagName !== 'BUTTON') {
                        if (onNavigate) onNavigate('detail');
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="td-home-page__card-image-wrapper">
                      <img className="td-home-page__card-image" src={item.imageUrl} alt={item.title} />
                      <div className={`td-home-page__card-badge td-home-page__card-badge--${item.categoryType}`}>
                        <span className="material-symbols-outlined text-sm">{item.categoryIcon}</span>
                        {item.category}
                      </div>
                    </div>
                    <div className="td-home-page__card-info">
                      <h3 className="td-headline-md td-home-page__card-title">{item.title}</h3>
                      <p className="td-body-lg td-home-page__card-price">{won(item.price)}</p>
                      <div className="td-home-page__card-meta">
                        <span className="td-label-sm td-home-page__card-meta-item">
                          <span className="material-symbols-outlined text-sm">group</span>
                          {item.currentParticipants}/{item.targetParticipants}명
                        </span>
                        <span className="td-label-sm td-home-page__card-meta-item">
                          <span className="material-symbols-outlined text-sm">directions_walk</span>
                          {item.distanceText}
                        </span>
                      </div>
                      <div className="td-home-page__card-progress-bar">
                        <div className="td-home-page__card-progress-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                      <button 
                        className={`td-home-page__card-action-btn ${isJoined ? 'td-home-page__card-action-btn--joined' : ''}`}
                        onClick={() => handleJoin(item.id)}
                        disabled={isJoined || isFull}
                      >
                        {isJoined ? '신청 완료' : isFull ? '마감 완료' : '참여하기'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="td-home-page__more-container">
            <button className="td-home-page__more-btn">
              더보기 <span className="material-symbols-outlined">expand_more</span>
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="td-home-page__footer">
        <div className="td-home-page__footer-brand">ThingDong</div>
        <div className="td-home-page__footer-links">
          <a className="td-home-page__footer-link" href="#terms">Terms of Service</a>
          <a className="td-home-page__footer-link" href="#privacy">Privacy Policy</a>
          <a className="td-home-page__footer-link" href="#partnership">Partnership</a>
          <a className="td-home-page__footer-link" href="#help">Help Center</a>
        </div>
        <div className="td-home-page__footer-copy">© 2024 ThingDong. Sharing for a fresher life.</div>
      </footer>

    </div>
  );
}
