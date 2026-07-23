import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveStoreInfo, getLatestStore } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import SuccessBanner from '../components/SuccessBanner';

export default function Setup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    store_name: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const loadStoreInfo = async () => {
      try {
        const response = await getLatestStore();
        if (response.data) {
          setFormData({
            store_name: response.data.store_name || '',
            category: response.data.category || ''
          });
        }
      } catch (err) {
        console.warn('저장된 가게 정보 없음:', err);
      } finally {
        setPageLoading(false);
      }
    };

    loadStoreInfo();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await saveStoreInfo({
        ...formData,
        owner_name: '',
        location: '',
        signature_item: ''
      });
      if (response.success) {
        console.log('[Setup] 저장된 정보:', response.data);
        console.log('[Setup] 카테고리:', response.data?.category);
        setSuccess(true);
        setTimeout(() => {
          // Dashboard 새로고침해서 최신 카테고리 로드
          console.log('[Setup] window.location.href로 대시보드 이동');
          window.location.href = '/dashboard';
        }, 1200);
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F4F7FE] to-[#E8ECFF]">
        <div className="text-center">
          <p className="text-[#737791]">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F4F7FE] to-[#E8ECFF] p-4">
      <div className="w-full max-w-md">
        {/* 로고/제목 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#151D48] mb-2">ShortsGen</h1>
          <p className="text-[#737791]">AI로 만드는 쇼츠</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#151D48] mb-2">시작하기</h2>
            <p className="text-sm text-[#737791]">가게 정보를 입력하세요</p>
          </div>

          <ErrorBanner
            message={error}
            onClose={() => setError(null)}
            autoClose={true}
          />

          <SuccessBanner
            message={success ? '✓ 시작 준비 완료! 곧 대시보드로 이동합니다' : null}
            onClose={() => setSuccess(false)}
            autoClose={true}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 가게명 */}
            <div>
              <label className="block text-sm font-semibold text-[#151D48] mb-3">
                가게명 <span className="text-[#FF5B5B]">*</span>
              </label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                placeholder="예: 망고빙수카페"
                required
                className="w-full rounded-xl px-4 py-3 border border-[#E8ECFF] bg-[#FAFBFF] text-[#151D48] placeholder-[#A0A7B8] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] focus:bg-white transition-all"
              />
            </div>

            {/* 업종 */}
            <div>
              <label className="block text-sm font-semibold text-[#151D48] mb-3">
                업종 <span className="text-[#FF5B5B]">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full rounded-xl px-4 py-3 border border-[#E8ECFF] bg-[#FAFBFF] text-[#151D48] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] focus:bg-white transition-all cursor-pointer"
              >
                <option value="">업종을 선택해주세요</option>
                <option value="카페">☕ 카페</option>
                <option value="음식점">🍽️ 음식점</option>
                <option value="베이커리">🥐 베이커리</option>
                <option value="편의점">🏪 편의점</option>
                <option value="의류">👕 의류</option>
                <option value="뷰티">💄 뷰티</option>
                <option value="기타">✨ 기타</option>
              </select>
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#5D5FEF] to-[#7C5CFF] hover:from-[#4B4CE0] hover:to-[#6B4BED] text-white py-3 rounded-xl font-bold text-base transition-all shadow-[0_4px_15px_rgba(93,95,239,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로딩 중...' : '시작하기'}
            </button>
          </form>

          {/* 하단 텍스트 */}
          <p className="text-center text-xs text-[#A0A7B8] mt-6">
            나머지 정보는 대시보드에서 수정할 수 있습니다
          </p>
        </div>

        {/* 하단 여백 */}
        <p className="text-center text-xs text-[#737791] mt-8">
          ShortsGen v1.0
        </p>
      </div>
    </div>
  );
}
