import { useState, useEffect } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { saveStoreInfo, getLatestStore } from '../api/client';

export default function StoreInfo() {
  const [formData, setFormData] = useState({
    store_name: '',
    owner_name: '',
    category: '',
    location: '',
    phone: '',
    instagram_url: '',
    page_url: '',
    signature_item: '',
    store_description: '',
    profile_image_url: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
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
            owner_name: response.data.owner_name || '',
            category: response.data.category || '',
            location: response.data.location || '',
            phone: response.data.phone || '',
            instagram_url: response.data.instagram_url || '',
            page_url: response.data.page_url || '',
            signature_item: response.data.signature_item || '',
            store_description: response.data.store_description || '',
            profile_image_url: response.data.profile_image_url || ''
          });
          if (response.data.profile_image_url) {
            setProfileImagePreview(response.data.profile_image_url);
          }
        }
      } catch (err) {
        console.warn('가게 정보 로드 실패:', err);
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload({ target: { files: [file] } });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 프로필 이미지 업로드
      let profileImageUrl = formData.profile_image_url;
      if (profileImage) {
        const formDataImage = new FormData();
        formDataImage.append('file', profileImage);
        const uploadResponse = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formDataImage
        });
        const uploadData = await uploadResponse.json();
        profileImageUrl = uploadData.file_url;
      }

      // 가게 정보 저장
      const response = await saveStoreInfo({
        ...formData,
        profile_image_url: profileImageUrl
      });

      if (response.success) {
        setSuccess(true);
        setProfileImage(null);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.message || '저장 실패');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#737791]">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-[#151D48]">내 가게 정보 관리</h1>
        <p className="text-[#737791] mt-2">AI 서비스 최적화를 위해 상세 정보를 입력하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 공지사항 */}
        <div className="bg-[#F0F4FF] border border-[#D8DFFF] rounded-2xl p-6 flex gap-4">
          <AlertCircle size={24} className="text-[#5D5FEF] flex-shrink-0 mt-1" />
          <div>
            <p className="font-semibold text-[#5D5FEF] text-sm">가게 정보가 정확히 입력되어야</p>
            <p className="text-xs text-[#737791] mt-1">AI 트렌드 분석과 콘텐츠 생성이 더 정확해집니다</p>
          </div>
        </div>

        {/* 대표 사진 */}
        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <label className="block text-sm font-semibold text-[#151D48] mb-4">
            대표 사진 <span className="text-[#FF5B5B]">*</span>
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDragDrop}
            className="border-2 border-dashed border-[#D8DFFF] rounded-2xl p-8 text-center cursor-pointer hover:bg-[#F4F7FE] transition-all"
          >
            {profileImagePreview ? (
              <div className="space-y-4">
                <img
                  src={profileImagePreview}
                  alt="프로필"
                  className="w-32 h-32 rounded-xl object-cover mx-auto"
                />
                <p className="text-sm text-[#737791]">클릭하거나 드래그하여 변경</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload size={40} className="mx-auto text-[#A0A7B8]" />
                <div>
                  <p className="text-sm font-semibold text-[#151D48]">사진을 드래그하거나</p>
                  <p className="text-xs text-[#737791]">클릭하여 업로드하세요</p>
                </div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="profile-image"
            />
            <label htmlFor="profile-image" className="cursor-pointer">
              <span className="sr-only">프로필 이미지 업로드</span>
            </label>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-6">
          <h3 className="text-lg font-bold text-[#151D48]">기본 정보</h3>

          <div className="grid grid-cols-2 gap-6">
            {/* 매장이름 */}
            <div>
              <label className="block text-sm font-semibold text-[#151D48] mb-3">
                매장이름 <span className="text-[#FF5B5B]">*</span>
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

            {/* 위치 */}
            <div>
              <label className="block text-sm font-semibold text-[#151D48] mb-3">
                위치 (지역 기반)
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="예: 서울 강남구 테헤란로"
                className="w-full rounded-xl px-4 py-3 border border-[#E8ECFF] bg-[#FAFBFF] text-[#151D48] placeholder-[#A0A7B8] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] focus:bg-white transition-all"
              />
            </div>

            {/* 매장 연락처 */}
            <div>
              <label className="block text-sm font-semibold text-[#151D48] mb-3">
                매장 연락처
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="예: 02-1234-5678"
                className="w-full rounded-xl px-4 py-3 border border-[#E8ECFF] bg-[#FAFBFF] text-[#151D48] placeholder-[#A0A7B8] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 대표자명 */}
          <div>
            <label className="block text-sm font-semibold text-[#151D48] mb-3">
              대표자명
            </label>
            <input
              type="text"
              name="owner_name"
              value={formData.owner_name}
              onChange={handleChange}
              placeholder="예: 김사장"
              className="w-full rounded-xl px-4 py-3 border border-[#E8ECFF] bg-[#FAFBFF] text-[#151D48] placeholder-[#A0A7B8] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* SNS 정보 */}
        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-6">
          <h3 className="text-lg font-bold text-[#151D48]">SNS & 페이지</h3>

          <div className="grid grid-cols-2 gap-6">
            {/* 인스타그램 */}
            <div>
              <label className="block text-sm font-semibold text-[#151D48] mb-3">
                인스타그램 주소
              </label>
              <input
                type="url"
                name="instagram_url"
                value={formData.instagram_url}
                onChange={handleChange}
                placeholder="예: www.instagram.com/mystore"
                className="w-full rounded-xl px-4 py-3 border border-[#E8ECFF] bg-[#FAFBFF] text-[#151D48] placeholder-[#A0A7B8] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] focus:bg-white transition-all"
              />
            </div>

            {/* 페이지/웹사이트 */}
            <div>
              <label className="block text-sm font-semibold text-[#151D48] mb-3">
                페이지/웹사이트
              </label>
              <input
                type="url"
                name="page_url"
                value={formData.page_url}
                onChange={handleChange}
                placeholder="예: www.mystore.com"
                className="w-full rounded-xl px-4 py-3 border border-[#E8ECFF] bg-[#FAFBFF] text-[#151D48] placeholder-[#A0A7B8] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* AI 설명 */}
        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-6">
          <h3 className="text-lg font-bold text-[#151D48]">AI 콘텐츠 생성 정보</h3>

          {/* 시그니처 상품 */}
          <div>
            <label className="block text-sm font-semibold text-[#151D48] mb-3">
              시그니처 상품/메뉴
            </label>
            <input
              type="text"
              name="signature_item"
              value={formData.signature_item}
              onChange={handleChange}
              placeholder="예: 망고빙수, 떡라테"
              className="w-full rounded-xl px-4 py-3 border border-[#E8ECFF] bg-[#FAFBFF] text-[#151D48] placeholder-[#A0A7B8] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] focus:bg-white transition-all"
            />
          </div>

          {/* 가게 설명 */}
          <div>
            <label className="block text-sm font-semibold text-[#151D48] mb-3">
              가게 설명 (콘텐츠 생성용)
            </label>
            <textarea
              name="store_description"
              value={formData.store_description}
              onChange={handleChange}
              placeholder="예: 우리 매장은 신선한 재료로 만든 빙수를 전문으로 합니다. 계절마다 다양한 메뉴를..."
              rows="4"
              className="w-full rounded-xl px-4 py-3 border border-[#E8ECFF] bg-[#FAFBFF] text-[#151D48] placeholder-[#A0A7B8] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF] focus:bg-white transition-all resize-none"
            />
            <p className="text-xs text-[#737791] mt-2">이 정보는 AI가 콘텐츠를 생성할 때 참고합니다</p>
          </div>
        </div>

        {/* 에러/성공 메시지 */}
        {error && (
          <div className="bg-[#FFE2E5] text-[#FF5B5B] p-4 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-[#DCFCE7] text-[#00B074] p-4 rounded-xl text-sm font-medium">
            ✓ 가게 정보가 저장되었습니다
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#5D5FEF] to-[#7C5CFF] hover:from-[#4B4CE0] hover:to-[#6B4BED] text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_4px_15px_rgba(93,95,239,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '저장 중...' : '정보 저장하기'}
        </button>
      </form>
    </div>
  );
}
