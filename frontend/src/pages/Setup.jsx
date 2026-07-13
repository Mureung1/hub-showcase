import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { saveStoreInfo } from '../api/client';

export default function Setup() {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    location: '',
    signature_menu: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

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
      const response = await saveStoreInfo(formData);
      if (response.success) {
        setSuccess(true);
        setFormData({ name: '', category: '', location: '', signature_menu: '' });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#151D48]">내 가게 정보</h1>
        <p className="text-[#737791] mt-2">AI 트렌드 분석과 콘텐츠 생성을 위해 가게 정보를 등록해주세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 가게명 */}
        <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <label className="block text-sm font-semibold text-[#151D48] mb-3">가게명 *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="예: 망고빙수카페"
            required
            className="w-full rounded-xl px-5 py-4 border border-[#F1F3F9] bg-white text-[#151D48] placeholder-[#737791] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] transition-all"
          />
        </div>

        {/* 업종 */}
        <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <label className="block text-sm font-semibold text-[#151D48] mb-3">업종 *</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="w-full rounded-xl px-5 py-4 border border-[#F1F3F9] bg-white text-[#151D48] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] transition-all"
          >
            <option value="">업종을 선택해주세요</option>
            <option value="카페">카페</option>
            <option value="음식점">음식점</option>
            <option value="베이커리">베이커리</option>
            <option value="편의점">편의점</option>
            <option value="의류">의류</option>
            <option value="뷰티">뷰티</option>
            <option value="기타">기타</option>
          </select>
        </div>

        {/* 위치 */}
        <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <label className="block text-sm font-semibold text-[#151D48] mb-3">위치 *</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="예: 서울 강남구 테헤란로"
            required
            className="w-full rounded-xl px-5 py-4 border border-[#F1F3F9] bg-white text-[#151D48] placeholder-[#737791] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] transition-all"
          />
        </div>

        {/* 시그니처 메뉴 */}
        <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <label className="block text-sm font-semibold text-[#151D48] mb-3">시그니처 메뉴 *</label>
          <input
            type="text"
            name="signature_menu"
            value={formData.signature_menu}
            onChange={handleChange}
            placeholder="예: 망고빙수, 떡라테"
            required
            className="w-full rounded-xl px-5 py-4 border border-[#F1F3F9] bg-white text-[#151D48] placeholder-[#737791] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] transition-all"
          />
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-[#FFE2E5] text-[#FF5B5B] p-4 rounded-xl">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div className="bg-[#DCFCE7] text-[#00B074] p-4 rounded-xl">
            <p className="text-sm font-semibold">✓ 가게 정보가 저장되었습니다</p>
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#5D5FEF] hover:bg-[#4B4CE0] text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_4px_10px_rgba(93,95,239,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? '저장 중...' : '가게 정보 저장'}
          {!loading && <ChevronRight size={20} />}
        </button>
      </form>
    </div>
  );
}
