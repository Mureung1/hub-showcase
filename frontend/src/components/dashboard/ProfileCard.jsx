import { useEffect, useState } from 'react';
import { getLatestStore } from '../../api/client';

export default function ProfileCard() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStore() {
      try {
        const response = await getLatestStore();
        if (response.success) {
          setStore(response.data);
        }
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch store:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStore();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] h-48 flex items-center justify-center">
        <p className="text-[#737791]">가게 정보 로딩 중...</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <p className="text-[#FF5B5B]">가게 정보를 찾을 수 없습니다. 먼저 '내 가게 정보'에서 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* 프로필 카드 헤더 */}
      <div className="p-8">
        <div className="flex gap-8 items-start">
          {/* 가게 사진 플레이스홀더 */}
          <div className="w-[140px] h-[140px] rounded-2xl bg-gradient-to-br from-[#F4F7FE] to-[#E2E8F0] flex items-center justify-center flex-shrink-0">
            <span className="text-4xl">🏪</span>
          </div>

          {/* 가게 정보 */}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-[#151D48]">{store.store_name}</h2>
                <p className="text-[#737791] font-medium text-sm mt-1">
                  {store.category} {store.location && `· ${store.location}`}
                </p>
              </div>
            </div>

            {/* 가게 정보 그리드 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-lg">🏷️</span>
                <div>
                  <p className="text-[#737791] text-xs">주력 상품</p>
                  <p className="font-semibold text-[#151D48]">{store.signature_item}</p>
                </div>
              </div>
              {store.owner_name && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-lg">👤</span>
                  <div>
                    <p className="text-[#737791] text-xs">대표자명</p>
                    <p className="font-semibold text-[#151D48]">{store.owner_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 컬러 바 */}
      <div className="flex h-1">
        <div className="flex-1 bg-[#FFE2E5]"></div>
        <div className="flex-1 bg-[#DCFCE7]"></div>
        <div className="flex-1 bg-[#FFF4DE]"></div>
      </div>
    </div>
  );
}
