import { useState } from 'react';
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

const won = (value) => `${new Intl.NumberFormat('ko-KR').format(value)}원`;

export default function PostfeedScreen({ onNavigate, posts, setPosts }) {
  const [joinedPosts, setJoinedPosts] = useState({});
  const [activeCategory, setActiveCategory] = useState('전체');
  const [activeFilter, setActiveFilter] = useState('Distance');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [locationName, setLocationName] = useState('경북 칠곡군 석적읍');

  const handleJoin = (id, e) => {
    e.stopPropagation(); // prevent triggering card navigation click
    if (joinedPosts[id]) return;

    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === id && post.currentParticipants < post.targetParticipants) {
          return { ...post, currentParticipants: post.currentParticipants + 1 };
        }
        return post;
      })
    );
    setJoinedPosts(prev => ({ ...prev, [id]: true }));
  };

  const handleCardClick = (id) => {
    if (onNavigate) {
      onNavigate('detail');
    }
  };

  const changeLocation = () => {
    const newLoc = prompt('동네 명을 입력해주세요:', locationName);
    if (newLoc && newLoc.trim() !== '') {
      setLocationName(newLoc);
    }
  };

  // Filter posts
  const filteredPosts = posts.filter(post => {
    // Category filter
    const matchesCategory = activeCategory === '전체' || post.category === activeCategory;
    // Available only (current < target)
    const matchesAvailability = !availableOnly || post.currentParticipants < post.targetParticipants;
    return matchesCategory && matchesAvailability;
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
                <p className="td-postfeed-page__header-subtitle text-body-md">내 주변 인기 공구</p>
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
              const isJoined = joinedPosts[post.id];
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
                      className={`td-postfeed-page__card-btn ${isJoined ? 'td-postfeed-page__card-btn--joined' : ''}`}
                      onClick={(e) => handleJoin(post.id, e)}
                      disabled={isJoined || isFull}
                    >
                      {isJoined ? '신청 완료' : isFull ? '마감 완료' : '참여하기'}
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
