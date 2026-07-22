import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroupPurchases, getMyGroupPurchaseActivities, joinGroupPurchase } from '../api/groupPurchase';
import './PostfeedScreen.css';

const categories = [
  { name: '전체', icon: 'grid_view' },
  { name: '식자재', icon: 'eco' },
  { name: '디지털기기', icon: 'devices' },
  { name: '생활용품', icon: 'shopping_bag' },
  { name: '의류/잡화', icon: 'checkroom' },
  { name: '뷰티/미용', icon: 'face' },
  { name: '반려동물', icon: 'pets' },
];

const won = (value) => `${new Intl.NumberFormat('ko-KR').format(value || 0)}원`;

export default function PostfeedScreen({ onNavigate }) {
  const queryClient = useQueryClient();
  const [joinedPosts, setJoinedPosts] = useState({});
  const [activeCategory, setActiveCategory] = useState('전체');
  const [activeFilter, setActiveFilter] = useState('Distance');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [locationName, setLocationName] = useState('경북 칠곡군 석적읍');
  const [joiningId, setJoiningId] = useState(null);
  const hasToken = Boolean(localStorage.getItem('accessToken'));

  // Fetch group purchases from database
  const { data: apiResponse } = useQuery({
    queryKey: ['groupPurchases', activeCategory],
    queryFn: () => {
      let categoryEnum = null;
      if (activeCategory === '식자재') {
        categoryEnum = 'FOOD';
      } else if (activeCategory === '생활용품') {
        categoryEnum = 'NECESSITY';
      } else if (activeCategory !== '전체') {
        categoryEnum = 'ETC';
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

  const rawPosts = apiResponse?.data || [];

  const mappedPosts = rawPosts.map(item => {
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
      badgeText: item.status === 'COMPLETED' ? '마감 완료' : '진행 중',
      badgeType: item.status === 'COMPLETED' ? 'danger' : 'info',
    };
  });

  const handleJoin = async (id, e) => {
    e.stopPropagation();
    if (joinedPosts[id]) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('인증 토큰이 없습니다. 우측 상단 프로필을 클릭하여 개발자 로그인을 먼저 진행해주세요.');
      return;
    }

    setJoiningId(id);
    try {
      const result = await joinGroupPurchase(id);
      if (result.success) {
        setJoinedPosts(prev => ({ ...prev, [id]: true }));
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

  const handleCardClick = (id) => {
    if (onNavigate) {
      onNavigate('detail', id);
    }
  };

  const changeLocation = () => {
    const newLoc = prompt('동네 명을 입력해주세요:', locationName);
    if (newLoc && newLoc.trim() !== '') {
      setLocationName(newLoc);
    }
  };

  const filteredPosts = mappedPosts.filter(post => {
    const matchesAvailability = !availableOnly || post.currentParticipants < post.targetParticipants;
    return matchesAvailability;
  });

  return (
    <div className="td-root td-postfeed-page">
      <main className="td-postfeed-page__content">
        
        {/* Left Sidebar (Category Filters) */}
        <aside className="td-postfeed-page__sidebar">
          {/* Create Post Button */}
          <button 
            className="td-postfeed-page__create-btn"
            onClick={() => { if (onNavigate) onNavigate('createpost'); }}
          >
            <span className="material-symbols-outlined">edit_square</span>
            게시글 작성
          </button>

          {/* Location Card */}
          <div className="td-postfeed-page__location-card">
            <div className="td-postfeed-page__location-info">
              <span className="material-symbols-outlined td-postfeed-page__location-pin">location_on</span>
              <div>
                <h4 className="td-postfeed-page__location-title">Greenwood Estates</h4>
                <p className="td-postfeed-page__location-subtitle">{locationName}</p>
              </div>
            </div>
            <button className="td-postfeed-page__location-change-btn" onClick={changeLocation}>
              Change Location
            </button>
            <div className="td-postfeed-page__avail-filter">
              <input 
                type="checkbox" 
                id="available-only-checkbox" 
                className="td-postfeed-page__checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
              />
              <label htmlFor="available-only-checkbox" className="td-postfeed-page__checkbox-label">
                거래 가능만 보기
              </label>
            </div>
          </div>

          {/* Categories List */}
          <div className="td-postfeed-page__categories">
            <h3 className="td-postfeed-page__categories-title">Category</h3>
            {categories.map((cat) => (
              <button 
                key={cat.name}
                className={`td-postfeed-page__category-btn ${activeCategory === cat.name ? 'td-postfeed-page__category-btn--active' : ''}`}
                onClick={() => setActiveCategory(cat.name)}
              >
                <span className="material-symbols-outlined">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="td-postfeed-page__main">
          
          {/* Header Area */}
          <div className="td-postfeed-page__main-header">
            <div className="td-postfeed-page__header-text">
              <span className="material-symbols-outlined text-3xl td-postfeed-page__near-icon">near_me</span>
              <div>
                <h2 className="td-headline-md">{locationName}</h2>
                <p className="td-postfeed-page__header-subtitle text-body-md">내 주변 인기 공동구매</p>
              </div>
            </div>
            {/* Sorting Pills */}
            <div className="td-postfeed-page__sorting">
              {['Distance', 'Deadline', 'Recent'].map((filter) => (
                <button 
                  key={filter} 
                  className={`td-postfeed-page__sort-btn ${activeFilter === filter ? 'td-postfeed-page__sort-btn--active' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Bento-style Cards Grid */}
          <div className="td-postfeed-page__grid">
            {filteredPosts.map((post) => {
              const isJoined = joinedPosts[post.id] || joinedPurchaseIds.has(post.id);
              const isHosted = hostedPurchaseIds.has(post.id);
              const isFull = post.currentParticipants >= post.targetParticipants;
              return (
                <article 
                  key={post.id} 
                  className="td-postfeed-page__card"
                  onClick={() => handleCardClick(post.id)}
                >
                  <div className="td-postfeed-page__card-image-wrapper">
                    <img className="td-postfeed-page__card-image" src={post.imageUrl} alt={post.title} />
                    {post.badgeText && (
                      <div className={`td-postfeed-page__card-badge td-postfeed-page__card-badge--${post.badgeType}`}>
                        <span className="material-symbols-outlined text-xs">timer</span>
                        {post.badgeText}
                      </div>
                    )}
                  </div>
                  <div className="td-postfeed-page__card-body">
                    <div className="td-postfeed-page__card-category">
                      <span className="material-symbols-outlined text-sm">eco</span>
                      <span className="td-label-sm">{post.category}</span>
                    </div>
                    <h3 className="td-postfeed-page__card-title">{post.title}</h3>
                    <div className="td-postfeed-page__card-meta-row">
                      <div>
                        <p className="td-postfeed-page__meta-label">Price Per Person</p>
                        <span className="td-postfeed-page__meta-price">{won(post.price)}</span>
                      </div>
                      <div className="td-postfeed-page__meta-stats">
                        <p className="td-postfeed-page__stats-item">
                          <span className="material-symbols-outlined text-xs">group</span>
                          {post.currentParticipants}/{post.targetParticipants}명
                        </p>
                        <p className="td-postfeed-page__stats-item td-postfeed-page__stats-item--sub">
                          <span className="material-symbols-outlined text-[12px]">directions_walk</span>
                          {post.distanceText}
                        </p>
                      </div>
                    </div>
                    <button 
                      className={`td-postfeed-page__card-btn ${isJoined || isHosted ? 'td-postfeed-page__card-btn--joined' : ''}`}
                      onClick={(e) => handleJoin(post.id, e)}
                      disabled={isHosted || isJoined || isFull || joiningId === post.id}
                    >
                      {isHosted ? '내가 쓴 글' : joiningId === post.id ? '처리중...' : isJoined ? '참여 중' : isFull ? '마감 완료' : '참여하기'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="td-postfeed-page__footer">
        <div className="td-postfeed-page__footer-brand">
          <span className="td-postfeed-page__footer-logo">ThingDong</span>
          <p className="td-postfeed-page__footer-copy">© 2024 ThingDong. Sharing for a fresher life.</p>
        </div>
        <div className="td-postfeed-page__footer-links">
          <a className="td-postfeed-page__footer-link" href="#terms">Terms of Service</a>
          <a className="td-postfeed-page__footer-link" href="#privacy">Privacy Policy</a>
          <a className="td-postfeed-page__footer-link" href="#partnership">Partnership</a>
          <a className="td-postfeed-page__footer-link" href="#help">Help Center</a>
        </div>
      </footer>
    </div>
  );
}
