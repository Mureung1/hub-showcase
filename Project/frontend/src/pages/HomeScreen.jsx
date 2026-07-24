import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroupPurchases, getMyGroupPurchaseActivities, joinGroupPurchase } from '../api/groupPurchase';
import './HomeScreen.css';

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

const won = (value) => `인당 ${new Intl.NumberFormat('ko-KR').format(value || 0)}원`;

export default function HomeScreen({ onNavigate }) {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [activeFilter, setActiveFilter] = useState('Distance');
  const [searchQuery, setSearchQuery] = useState('');
  const [joinedItems, setJoinedItems] = useState({});
  const [joiningId, setJoiningId] = useState(null);
  const hasToken = Boolean(localStorage.getItem('accessToken'));

  // Fetch group purchases from database
  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: ['groupPurchases', activeCategory],
    queryFn: () => {
      let categoryEnum = null;
      if (activeCategory === '식자재' || activeCategory === '과일' || activeCategory === '수산/정육' || activeCategory === '밀키트' || activeCategory === '유제품') {
        categoryEnum = 'FOOD';
      } else if (activeCategory === '생필품') {
        categoryEnum = 'NECESSITY';
      }
      return getGroupPurchases(categoryEnum ? { category: categoryEnum } : {});
    }
  });
  const { data: myActivityResponse } = useQuery({
    queryKey: ['myGroupPurchaseActivities'],
    queryFn: getMyGroupPurchaseActivities,
    enabled: hasToken,
  });
  const joinedPurchaseIds = new Set((myActivityResponse?.data?.joined || []).map((purchase) => purchase.id));
  const hostedPurchaseIds = new Set((myActivityResponse?.data?.hosted || []).map((purchase) => purchase.id));

  const purchases = (apiResponse?.data || []).map(item => {
    let categoryLabel = '기타';
    let categoryIcon = 'grid_view';
    let categoryType = 'secondary';
    let imageUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoSLBuND-cSFGw7ZEoTx_gc_kgDUBVzOCUv-VDbAFvqavlDcyh7HY8uTZFUAoAl8vYLbPZxRHx-GXAJdI6mU-RA-JkPuaRmECQJytdQJ8lBNr4G7GjQX-nLX5PCwACr4ilPXOvi6kBgPNRuUXK2ide3A4WUmuGPUFOHfkQI89mZ3awj5hP4sgmitWAXu3Vv2W8_YxpiKoa63Q87Pw_RL8V0cPZZC0xLkqSTECI6s-nvU0hKLykJyE';

    if (item.category === 'FOOD') {
      categoryLabel = '식자재';
      categoryIcon = 'eco';
      categoryType = 'primary';
      imageUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmzACAEWQoMTE7-vlQdE_JHrSn7P1pBbBEPbO10G4Dbe5MCoPLL0Xxg51k-faWq_CfF7V0xFFqnZUH9ciSUp7_Yc_BoLaVl2ZTvpEWPXU08YxbrX5Vgkwu7ugcElfMo52SrhfsOP8z2ZrUUkZy_tQb-MMBPemue9nglz_BjtRCbAFZZ2ve_DGO89qhcmmAvunPgyFwhiiw4v93-ZGQrG28Nrmr0uofGFxSpRpFXNFbbjKmkNSvqCs';
    } else if (item.category === 'NECESSITY') {
      categoryLabel = '생필품';
      categoryIcon = 'local_mall';
      categoryType = 'secondary';
      imageUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3Jgk1WL3bHM7C6vwAUT_s8auzkGNvqaZ1GMfzW7Lv0PhcOL2riiWQ_xvPzlchfF3MvcU1RBi9Eqqd3N0hj4G-yfIeSEMXh4dZkPRGT7AtdE4UU8yIehvP3ISAfTqxnAtnc3VIsVW6QzzA73JQ8mxZLq0U2171YNUHYdEz_FKoTo8Xm8anAcfRngm5zdfGzB5GEwL9z6lSIYs2Pp6OAP4nxvQBNMgJl-BAVGeE6WHuIA_wMNtJmYY';
    }

    imageUrl = item.imageUrl || item.imageUrls?.[0] || imageUrl;

    return {
      id: item.id,
      category: categoryLabel,
      categoryIcon,
      categoryType,
      title: item.title,
      price: item.perPersonPrice,
      currentParticipants: item.currentParticipants,
      targetParticipants: item.targetParticipants,
      distanceText: item.pickupTimeSlot || '도보 10분',
      imageUrl,
      status: item.status,
      deadlineAt: item.deadlineAt,
      createdAt: item.createdAt,
    };
  });

  const visiblePurchases = purchases
    .filter((item) => item.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .sort((a, b) => {
      if (activeFilter === 'Deadline') return new Date(a.deadlineAt) - new Date(b.deadlineAt);
      if (activeFilter === 'Recent') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

  const handleJoin = async (id, e) => {
    e.stopPropagation();
    if (joinedItems[id]) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('인증 토큰이 없습니다. 우측 상단 프로필을 클릭하여 개발자 로그인을 먼저 진행해주세요.');
      return;
    }

    setJoiningId(id);
    try {
      const result = await joinGroupPurchase(id);
      if (result.success) {
        setJoinedItems(prev => ({ ...prev, [id]: true }));
        alert('참여 신청이 완료되었습니다!');
        queryClient.invalidateQueries({ queryKey: ['groupPurchases'] });
        queryClient.invalidateQueries({ queryKey: ['myGroupPurchaseActivities'] });
      } else {
        alert(result.error?.message || '참여 신청에 실패했습니다.');
      }
    } catch (err) {
      alert(err.message || '참여 신청 중 오류가 발생했습니다.');
    } finally {
      setJoiningId(null);
    }
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
            <h2 className="td-headline-md text-on-surface">내 주변 인기 공동구매</h2>
            <div className="td-home-page__filters">
              {['Recent', 'Deadline'].map((filter) => (
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

          {isLoading && <p className="td-body-md">Loading group purchases...</p>}
          {error && <p className="td-body-md">Unable to load group purchases. Please try again.</p>}
          {!isLoading && !error && visiblePurchases.length === 0 && (
            <p className="td-body-md">No group purchases match your search.</p>
          )}
          <div className="td-home-page__grid">
            {visiblePurchases
              .map((item) => {
                const progress = (item.currentParticipants / item.targetParticipants) * 100;
                const isJoined = joinedItems[item.id] || joinedPurchaseIds.has(item.id);
                const isHosted = hostedPurchaseIds.has(item.id);
                const isFull = item.currentParticipants >= item.targetParticipants;
                const isJoining = joiningId === item.id;
                return (
                  <div 
                    className="td-home-page__card" 
                    key={item.id}
                    onClick={(e) => {
                      if (e.target.tagName !== 'BUTTON') {
                        if (onNavigate) onNavigate('detail', item.id);
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
                        className={`td-home-page__card-action-btn ${isJoined || isHosted ? 'td-home-page__card-action-btn--joined' : ''}`}
                        onClick={(e) => handleJoin(item.id, e)}
                        disabled={isHosted || isJoined || isFull || isJoining}
                      >
                        {isHosted ? '내가 쓴 글' : isJoining ? '처리중...' : isJoined ? '참여 중' : isFull ? '마감 완료' : '참여하기'}
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
