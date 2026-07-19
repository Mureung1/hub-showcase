import { useState, useEffect } from 'react';
import './CreatePostScreen.css';

export default function CreatePostScreen({ onNavigate, onAddPost }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [targetCount, setTargetCount] = useState(2);
  const [totalPrice, setTotalPrice] = useState('');
  const [perPersonPrice, setPerPersonPrice] = useState(0);
  const [pickupPlace, setPickupPlace] = useState('센트럴파크 아파트, 메인 로비 (A동)');
  const [pickupTime, setPickupTime] = useState('');
  const [description, setDescription] = useState('');

  // Automatically calculate per-person price
  useEffect(() => {
    const total = parseFloat(totalPrice) || 0;
    if (targetCount > 0) {
      setPerPersonPrice(Math.round(total / targetCount));
    } else {
      setPerPersonPrice(0);
    }
  }, [totalPrice, targetCount]);

  const handleDecrement = () => {
    if (targetCount > 2) {
      setTargetCount(prev => prev - 1);
    }
  };

  const handleIncrement = () => {
    setTargetCount(prev => prev + 1);
  };

  const handlePriceChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^[0-9]*$/.test(val)) {
      setTotalPrice(val);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!category) {
      alert('카테고리를 선택해주세요.');
      return;
    }
    if (!totalPrice || parseInt(totalPrice) <= 0) {
      alert('총 금액을 바르게 입력해주세요.');
      return;
    }
    if (!pickupTime) {
      alert('픽업 시간을 입력해주세요.');
      return;
    }
    if (!description.trim()) {
      alert('상세 설명을 입력해주세요.');
      return;
    }

    // Map selected category value to readable label
    const categoryLabels = {
      groceries: '식자재',
      household: '생활용품',
      electronics: '디지털기기',
      others: '기타'
    };
    const categoryIcons = {
      groceries: 'eco',
      household: 'shopping_bag',
      electronics: 'devices',
      others: 'grid_view'
    };

    const newPost = {
      id: Date.now(),
      category: categoryLabels[category] || '기타',
      categoryIcon: categoryIcons[category] || 'grid_view',
      title: title.trim(),
      price: perPersonPrice,
      currentParticipants: 1, // Author is automatically participant #1
      targetParticipants: targetCount,
      distanceText: '도보 5분', // Mock value
      badgeText: '방금전',
      badgeType: 'info',
      imageUrl: category === 'groceries' 
        ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwQY-Lso4qEhyEFancWjmu3Ol2MC7HLh2ZVUTYIpLqu8g3TKffzWWPaFuRG9e330wpbn9Ybviijw7agnijtNN6-OMGM_1-VCgyUtrYxeUcnL9t6OAqomHvxrDYaWttM_GdJtsKvjhcEmX7EqHP7pt744YSV94txYaQ8n3BX0G6eIjbRdSngdf2mgFO0EJikRCj4iFeYv_5x3su-m8CtE7ea1214BMKAc_ulvLD6NxuRuyubO8LQv8'
        : 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoSLBuND-cSFGw7ZEoTx_gc_kgDUBVzOCUv-VDbAFvqavlDcyh7HY8uTZFUAoAl8vYLbPZxRHx-GXAJdI6mU-RA-JkPuaRmECQJytdQJ8lBNr4G7GjQX-nLX5PCwACr4ilPXOvi6kBgPNRuUXK2ide3A4WUmuGPUFOHfkQI89mZ3awj5hP4sgmitWAXu3Vv2W8_YxpiKoa63Q87Pw_RL8V0cPZZC0xLkqSTECI6s-nvU0hKLykJyE',
    };

    if (onAddPost) {
      onAddPost(newPost);
    }

    alert('공동구매 게시글이 성공적으로 등록되었습니다!');
    onNavigate('postfeed');
  };

  const selectPlace = () => {
    const place = prompt('픽업 위치를 지정해주세요:', pickupPlace);
    if (place && place.trim() !== '') {
      setPickupPlace(place);
    }
  };

  return (
    <div className="td-root td-createpost-page">
      <main className="td-createpost-page__content">
        <div className="td-createpost-page__form-container">
          <h1 className="td-headline-lg td-createpost-page__title">공동구매 등록하기</h1>
          
          <form className="td-createpost-page__form" onSubmit={handleSubmit}>
            
            {/* Photo Upload Area */}
            <div className="td-createpost-page__field">
              <label className="td-label-md td-createpost-page__label">상품 사진</label>
              <div className="td-createpost-page__photo-uploader">
                <span className="material-symbols-outlined">add_a_photo</span>
                <p className="td-body-md">사진을 등록해주세요 (최대 5장)</p>
              </div>
            </div>

            {/* Title */}
            <div className="td-createpost-page__field">
              <label className="td-label-md td-createpost-page__label" htmlFor="post-title">제목</label>
              <input 
                className="td-createpost-page__input" 
                id="post-title" 
                placeholder="공동구매 제목을 입력하세요" 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* URL */}
            <div className="td-createpost-page__field">
              <label className="td-label-md td-createpost-page__label" htmlFor="post-url">상품 URL</label>
              <div className="td-createpost-page__input-with-icon">
                <span className="material-symbols-outlined">link</span>
                <input 
                  className="td-createpost-page__input pl-10" 
                  id="post-url" 
                  placeholder="상품 링크가 있다면 입력해주세요 (선택)" 
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Category & Target Count Row */}
            <div className="td-createpost-page__row">
              <div className="td-createpost-page__field flex-grow">
                <label className="td-label-md td-createpost-page__label" htmlFor="post-category">카테고리</label>
                <select 
                  className="td-createpost-page__input td-createpost-page__select" 
                  id="post-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">카테고리 선택</option>
                  <option value="groceries">식료품</option>
                  <option value="household">생활용품</option>
                  <option value="electronics">가전/디지털</option>
                  <option value="others">기타</option>
                </select>
              </div>
              
              <div className="td-createpost-page__field w-64 flex-shrink-0">
                <label className="td-label-md td-createpost-page__label" htmlFor="post-target-count">모집 인원</label>
                <div className="td-createpost-page__counter">
                  <button type="button" className="td-createpost-page__counter-btn" onClick={handleDecrement}>-</button>
                  <input 
                    type="number" 
                    className="td-createpost-page__counter-input" 
                    id="post-target-count" 
                    value={targetCount}
                    readOnly
                  />
                  <button type="button" className="td-createpost-page__counter-btn" onClick={handleIncrement}>+</button>
                </div>
              </div>
            </div>

            {/* Price Box with Dynamic Calculation */}
            <div className="td-createpost-page__price-box">
              <div className="td-createpost-page__price-icon">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div className="td-createpost-page__price-content">
                <div className="td-createpost-page__field">
                  <label className="td-label-md td-createpost-page__price-label" htmlFor="post-total-price">총 금액 (₩)</label>
                  <input 
                    className="td-createpost-page__price-input" 
                    id="post-total-price" 
                    placeholder="0" 
                    type="text"
                    value={totalPrice}
                    onChange={handlePriceChange}
                  />
                </div>
                <div className="td-createpost-page__price-split">
                  <span className="td-label-md">1인당 금액:</span>
                  <span className="td-headline-md">₩ {new Intl.NumberFormat('ko-KR').format(perPersonPrice)}</span>
                </div>
              </div>
            </div>

            {/* Pickup Details Row */}
            <div className="td-createpost-page__row">
              <div className="td-createpost-page__field flex-grow">
                <label className="td-label-md td-createpost-page__label">픽업 위치</label>
                <button 
                  type="button" 
                  className="td-createpost-page__location-btn"
                  onClick={selectPlace}
                >
                  <span className="truncate">{pickupPlace}</span>
                  <span className="material-symbols-outlined">location_on</span>
                </button>
              </div>

              <div className="td-createpost-page__field flex-grow">
                <label className="td-label-md td-createpost-page__label" htmlFor="post-pickup-time">픽업 시간</label>
                <input 
                  className="td-createpost-page__input" 
                  id="post-pickup-time" 
                  type="datetime-local"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="td-createpost-page__field">
              <label className="td-label-md td-createpost-page__label" htmlFor="post-desc">상세 설명</label>
              <textarea 
                className="td-createpost-page__textarea" 
                id="post-desc" 
                rows="4"
                placeholder="상품에 대한 설명, 상태, 픽업 시 유의사항 등을 적어주세요..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Form Actions */}
            <div className="td-createpost-page__actions">
              <button 
                type="button" 
                className="td-createpost-page__cancel-btn"
                onClick={() => onNavigate('postfeed')}
              >
                취소
              </button>
              <button type="submit" className="td-createpost-page__submit-btn">
                <span>등록하기</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="td-createpost-page__footer">
        <div className="td-createpost-page__footer-brand">
          <span className="td-createpost-page__footer-logo">ThingDong</span>
          <p className="td-createpost-page__footer-copy">© 2024 띵동. 더 신선한 삶을 위한 나눔.</p>
        </div>
        <div className="td-createpost-page__footer-links">
          <a className="td-createpost-page__footer-link" href="#terms">이용약관</a>
          <a className="td-createpost-page__footer-link" href="#privacy">개인정보처리방침</a>
          <a className="td-createpost-page__footer-link" href="#partnership">제휴문의</a>
          <a className="td-createpost-page__footer-link" href="#help">고객센터</a>
        </div>
      </footer>
    </div>
  );
}
