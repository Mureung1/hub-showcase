import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createGroupPurchase } from '../api/groupPurchase';
import { calculatePerPersonPrice } from '../utils/calculatePerPersonPrice';
import KakaoMap from '../components/KakaoMap';
import './CreatePostScreen.css';

export default function CreatePostScreen({ onNavigate }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [targetCount, setTargetCount] = useState(2);
  const [totalPrice, setTotalPrice] = useState('');
  const [perPersonPrice, setPerPersonPrice] = useState(0);
  const [pickupPlace, setPickupPlace] = useState('센트럴파크 아파트, 메인 로비 (A동)');
  const [pickupLocation, setPickupLocation] = useState({ latitude: 37.5665, longitude: 126.978 });
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [pickupTime, setPickupTime] = useState('');
  const [description, setDescription] = useState('');

  // Automatically calculate per-person price
  useEffect(() => {
    const total = parseFloat(totalPrice) || 0;
    setPerPersonPrice(calculatePerPersonPrice(total, targetCount));
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

  const handleSubmit = async (e) => {
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

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('인증 토큰이 없습니다. 우측 상단 프로필을 클릭하여 개발자 로그인을 먼저 진행해주세요.');
      return;
    }

    // Map category to backend ENUM
    let categoryEnum = 'ETC';
    if (category === 'groceries') {
      categoryEnum = 'FOOD';
    } else if (category === 'household') {
      categoryEnum = 'NECESSITY';
    }

    const postData = {
      title: title.trim(),
      description: description.trim(),
      productUrl: url.trim() || 'http://example.com/product',
      totalPrice: Number(totalPrice),
      targetParticipants: Number(targetCount),
      pickupLatitude: pickupLocation.latitude,
      pickupLongitude: pickupLocation.longitude,
      pickupPlace,
      pickupTimeSlot: pickupTime,
      category: categoryEnum,
      deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // default 3 days
    };

    try {
      const result = await createGroupPurchase(postData);
      if (result.success) {
        alert('공동구매 게시글이 성공적으로 등록되었습니다!');
        queryClient.invalidateQueries({ queryKey: ['groupPurchases'] });
        if (onNavigate) {
          onNavigate('detail', result.data.id);
        }
      } else {
        alert(result.error?.message || '공동구매 등록에 실패했습니다.');
      }
    } catch (err) {
      alert(err.message || '등록 중 오류가 발생했습니다.');
    }
  };

  const selectPlace = () => setIsMapModalOpen(true);

  const handleLocationChange = ({ latitude, longitude, address }) => {
    setPickupLocation({ latitude, longitude });
    if (address) setPickupPlace(address);
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

      {isMapModalOpen && (
        <div className="td-createpost-page__map-modal-backdrop" role="dialog" aria-modal="true" aria-label="픽업 위치 설정">
          <section className="td-createpost-page__map-modal">
            <h2 className="td-headline-md">지도에서 픽업 위치 선택</h2>
            <p className="td-body-md">지도를 클릭하거나 핀을 드래그하면 좌표와 주소가 저장됩니다.</p>
            <KakaoMap
              latitude={pickupLocation.latitude}
              longitude={pickupLocation.longitude}
              onLocationChange={handleLocationChange}
              height={360}
            />
            <p className="td-body-md">선택 위치: {pickupPlace}</p>
            <div className="td-createpost-page__actions">
              <button type="button" className="td-createpost-page__cancel-btn" onClick={() => setIsMapModalOpen(false)}>닫기</button>
              <button type="button" className="td-createpost-page__submit-btn" onClick={() => setIsMapModalOpen(false)}>이 위치로 저장</button>
            </div>
          </section>
        </div>
      )}

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
