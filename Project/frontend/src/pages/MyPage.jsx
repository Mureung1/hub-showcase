import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelGroupPurchaseJoin, getFavoriteGroupPurchases, getMyGroupPurchaseActivities, updateMyLocation } from '../api/groupPurchase';
import { filterPurchasesByActivity } from '../utils/filterPurchasesByActivity';
import { getProfileImageUrl } from '../utils/profileImage';
import KakaoMap from '../components/KakaoMap';
import './MyPage.css';

const statusLabels = {
  RECRUITING: '모집 중',
  COMPLETED: '모집 완료',
  ORDERED: '주문 완료',
  WAITING_PICKUP: '수령 대기',
  FINISHED: '종료',
  FAILED: '모집 실패',
};

const won = (value) => `${new Intl.NumberFormat('ko-KR').format(value || 0)}원`;

function PurchaseCard({ purchase, onNavigate, onCancel, cancellingId, isJoined }) {
  const progress = Math.min((purchase.currentParticipants / purchase.targetParticipants) * 100, 100);
  const canCancel = isJoined && purchase.status === 'RECRUITING';

  return (
    <article className="td-mypage__card td-mypage__item-card">
      <div className={`td-mypage__item-img-wrapper ${purchase.imageUrl || purchase.imageUrls?.[0] ? 'td-mypage__item-img-wrapper--has-image' : ''}`}>
        {(purchase.imageUrl || purchase.imageUrls?.[0]) && (
          <img
            className="td-mypage__item-img"
            src={purchase.imageUrl || purchase.imageUrls?.[0]}
            alt={`${purchase.title} 대표 이미지`}
          />
        )}
        <div className="td-mypage__profile-avatar">{purchase.category === 'FOOD' ? '식' : '생'}</div>
        <div className="td-mypage__item-badge td-mypage__item-badge--recruiting">
          <span className="td-label-sm">{statusLabels[purchase.status] || purchase.status}</span>
        </div>
      </div>
      <div className="td-mypage__item-body">
        <h3 className="td-headline-md">{purchase.title}</h3>
        <p className="td-body-md">1인 금액 {won(purchase.perPersonPrice)}</p>
        <div className="td-mypage__item-progress-section">
          <div className="td-mypage__item-progress-header">
            <span className="td-label-sm">참여 현황</span>
            <span className="td-label-md">{purchase.currentParticipants}/{purchase.targetParticipants}명</span>
          </div>
          <div className="td-mypage__item-progress-track">
            <div className="td-mypage__item-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <button className="td-mypage__item-action-btn" onClick={() => onNavigate('detail', purchase.id)}>
            상세 보기
          </button>
          {canCancel && (
            <button
              className="td-mypage__item-action-btn td-mypage__item-action-btn--disabled"
              onClick={() => onCancel(purchase.id)}
              disabled={cancellingId === purchase.id}
            >
              {cancellingId === purchase.id ? '참여 취소 중...' : '참여 취소'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MyPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('hosted');
  const [activityFilter, setActivityFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [pendingLocation, setPendingLocation] = useState({ latitude: 37.5665, longitude: 126.978, address: '' });
  useEffect(() => {
    localStorage.removeItem('myPageTab');
  }, []);
  const queryClient = useQueryClient();
  const hasToken = Boolean(localStorage.getItem('accessToken'));
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['myGroupPurchaseActivities'],
    queryFn: getMyGroupPurchaseActivities,
    enabled: hasToken,
  });
  const { data: favoriteResponse, isLoading: isFavoriteLoading } = useQuery({
    queryKey: ['favoriteGroupPurchases'],
    queryFn: getFavoriteGroupPurchases,
    enabled: hasToken && activeTab === 'favorite',
  });
  const data = response?.data;
  const allPurchases = activeTab === 'hosted'
    ? data?.hosted || []
    : activeTab === 'joined'
      ? data?.joined || []
      : favoriteResponse?.data || [];
  const purchases = filterPurchasesByActivity(allPurchases, activityFilter);

  async function handleCancel(id) {
    setCancellingId(id);
    try {
      await cancelGroupPurchaseJoin(id);
      queryClient.invalidateQueries({ queryKey: ['myGroupPurchaseActivities'] });
      queryClient.invalidateQueries({ queryKey: ['groupPurchases'] });
    } catch (apiError) {
      alert(apiError.message || '참여 취소에 실패했습니다.');
    } finally {
      setCancellingId(null);
    }
  }

  function openLocationModal() {
    setPendingLocation({
      latitude: data?.user?.baseLatitude || 37.5665,
      longitude: data?.user?.baseLongitude || 126.978,
      address: data?.user?.baseAddress || '',
    });
    setIsLocationModalOpen(true);
  }

  async function saveLocation() {
    setLocationSaving(true);
    try {
      await updateMyLocation(pendingLocation);
      queryClient.invalidateQueries({ queryKey: ['myGroupPurchaseActivities'] });
      queryClient.invalidateQueries({ queryKey: ['groupPurchases'] });
      setIsLocationModalOpen(false);
    } catch (apiError) {
      alert(apiError.message || '내 위치를 저장하지 못했습니다.');
    } finally {
      setLocationSaving(false);
    }
  }

  if (!hasToken) {
    return <main className="td-mypage__content"><p className="td-body-md">우측 상단 프로필 메뉴에서 개발용 로그인을 해주세요.</p></main>;
  }
  if (isLoading) {
    return <main className="td-mypage__content"><p className="td-body-md">마이페이지를 불러오는 중입니다.</p></main>;
  }
  if (error) {
    return <main className="td-mypage__content"><p className="td-body-md">마이페이지를 불러오지 못했습니다.</p></main>;
  }

  const user = data.user;
  if (activeTab === 'favorite' && isFavoriteLoading) {
    return <main className="td-mypage__content"><p className="td-body-md">찜한 공동구매를 불러오는 중입니다.</p></main>;
  }
  return (
    <div className="td-root td-mypage">
      <main className="td-mypage__content">
        <header className="td-mypage__header-title-row"><h1 className="td-headline-lg">마이페이지</h1></header>
        <div className="td-mypage__grid">
          <aside className="td-mypage__left-column">
            <section className="td-mypage__card td-mypage__profile-card">
              <div className="td-mypage__profile-bg-glow" />
              <div className="td-mypage__profile-info">
                <div className="td-mypage__profile-avatar"><img src={getProfileImageUrl(user.id)} alt={`${user.nickname} 프로필 사진`} /></div>
                <div><h2 className="td-headline-md">{user.nickname}</h2><p className="td-mypage__profile-loc">공동구매 활동을 관리해요</p></div>
              </div>
              {user.baseAddress && <p className="td-mypage__saved-location"><span className="material-symbols-outlined">location_on</span>{user.baseAddress}</p>}
              <button className="td-mypage__location-btn" onClick={openLocationModal}>
                <span className="material-symbols-outlined">location_on</span>
                {user.baseLatitude != null ? '내 위치 다시 설정' : '내 위치 설정하기'}
              </button>
              <div className="td-mypage__manner-box">
                <div className="td-mypage__manner-header"><span className="td-label-md">매너 온도</span><span className="td-label-md td-mypage__manner-temp">{user.mannerTemperature}°C</span></div>
                <div className="td-mypage__manner-bar-track"><div className="td-mypage__manner-bar-fill" style={{ width: `${Math.min(user.mannerTemperature, 100)}%` }} /></div>
              </div>
              <div className="td-mypage__noshow-row"><span className="td-body-md">노쇼 횟수</span><span className="td-label-md td-mypage__noshow-badge">{user.noShowCount}회</span></div>
            </section>
            <section className="td-mypage__card td-mypage__activity-filter-card">
              <div className="td-mypage__activity-filter-header">
                <span className="td-label-md">공동구매 상태</span>
                <span className="td-label-sm">{purchases.length}개</span>
              </div>
              <div className="td-mypage__activity-filter-bar" role="group" aria-label="공동구매 상태 필터">
                <button className={activityFilter === 'all' ? 'td-mypage__activity-filter-btn td-mypage__activity-filter-btn--active' : 'td-mypage__activity-filter-btn'} onClick={() => setActivityFilter('all')}>전체</button>
                <button className={activityFilter === 'recruiting' ? 'td-mypage__activity-filter-btn td-mypage__activity-filter-btn--active' : 'td-mypage__activity-filter-btn'} onClick={() => setActivityFilter('recruiting')}>진행 중</button>
                <button className={activityFilter === 'closed' ? 'td-mypage__activity-filter-btn td-mypage__activity-filter-btn--active' : 'td-mypage__activity-filter-btn'} onClick={() => setActivityFilter('closed')}>마감</button>
              </div>
              <p className="td-mypage__activity-filter-help">{activityFilter === 'closed' ? '모집이 끝난 공동구매를 보고 있어요.' : activityFilter === 'recruiting' ? '현재 참여할 수 있는 공동구매를 보고 있어요.' : '모든 공동구매 상태를 보고 있어요.'}</p>
            </section>
          </aside>

          <section className="td-mypage__right-column">
            <div className="td-mypage__tabs-container">
              <button className={`td-mypage__tab-btn ${activeTab === 'favorite' ? 'td-mypage__tab-btn--active' : ''}`} onClick={() => setActiveTab('favorite')}>♥ 찜한 공동구매</button>
              <button className={`td-mypage__tab-btn ${activeTab === 'hosted' ? 'td-mypage__tab-btn--active' : ''}`} onClick={() => setActiveTab('hosted')}>내가 만든 공동구매</button>
              <button className={`td-mypage__tab-btn ${activeTab === 'joined' ? 'td-mypage__tab-btn--active' : ''}`} onClick={() => setActiveTab('joined')}>내가 참여한 공동구매</button>
            </div>
            <div className="td-mypage__tab-content-grid">
              {purchases.map((purchase) => <PurchaseCard key={purchase.id} purchase={purchase} onNavigate={onNavigate} onCancel={handleCancel} cancellingId={cancellingId} isJoined={activeTab === 'joined'} />)}
              {purchases.length === 0 && <p className="td-body-md">표시할 공동구매가 없습니다.</p>}
              {activeTab === 'hosted' && (
                <button className="td-mypage__add-cta-card" onClick={() => onNavigate('createpost')}>
                  <span className="td-headline-md">새 공동구매 시작하기</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
      {isLocationModalOpen && (
        <div className="td-mypage__location-modal-backdrop" role="dialog" aria-modal="true" aria-label="내 위치 설정">
          <section className="td-mypage__location-modal">
            <h2>내 위치 설정하기</h2>
            <p>지도를 클릭하거나 주소를 검색해 내 위치를 설정하세요.</p>
            <KakaoMap
              latitude={pendingLocation.latitude}
              longitude={pendingLocation.longitude}
              onLocationChange={setPendingLocation}
              height={300}
            />
            <p className="td-mypage__location-address">{pendingLocation.address || '지도에서 위치를 선택해 주세요.'}</p>
            <div className="td-mypage__location-modal-actions">
              <button onClick={() => setIsLocationModalOpen(false)}>취소</button>
              <button onClick={saveLocation} disabled={locationSaving}>{locationSaving ? '저장 중...' : '이 위치로 저장'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
