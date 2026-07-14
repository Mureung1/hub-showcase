import { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadImage, getLatestStore } from '../api/client';

export default function Generate() {
  const navigate = useNavigate();
  const [currentStore, setCurrentStore] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [storeError, setStoreError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Phase 8: 캠페인 플래닝
  const [purpose, setPurpose] = useState([]);
  const [mood, setMood] = useState('');

  const purposeOptions = [
    '신메뉴 소개',
    '할인 이벤트',
    '가게 분위기',
    '추천 음식',
    '고객 후기'
  ];

  const moodOptions = [
    { value: 'bright', label: '밝고 활기찬' },
    { value: 'elegant', label: '세련되고 고급스러운' },
    { value: 'friendly', label: '친근하고 편안한' },
    { value: 'mysterious', label: '신비롭고 매력적인' }
  ];

  const handlePurposeToggle = (option) => {
    setPurpose(prev =>
      prev.includes(option)
        ? prev.filter(p => p !== option)
        : [...prev, option]
    );
  };

  const handleStartGeneration = () => {
    if (!uploadedImage) {
      setUploadError('이미지를 먼저 업로드하세요');
      return;
    }
    if (purpose.length === 0) {
      alert('프로모션 목적을 최소 1개 이상 선택하세요');
      return;
    }
    if (!mood) {
      alert('비디오 무드를 선택하세요');
      return;
    }
    console.log('비디오 생성 시작:', {
      image_id: uploadedImage.image_id,
      purpose,
      mood
    });
    // Phase 9 완성 후 실제 AI 파이프라인으로 교체
    // 지금은 Mock 데이터로 Review 페이지로 이동
    navigate('/review');
  };

  // 페이지 마운트 시 현재 가게 정보 로드
  useEffect(() => {
    const loadStore = async () => {
      try {
        const storeData = await getLatestStore();
        if (storeData.data) {
          setCurrentStore(storeData.data);
          setStoreError(null);
        }
      } catch (error) {
        setStoreError('가게 정보를 로드하지 못했습니다. Setup에서 가게 정보를 먼저 등록하세요.');
        console.error('Store load error:', error);
      }
    };

    loadStore();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    setUploadError(null);

    // 가게 정보 확인
    if (!currentStore) {
      setUploadError('가게 정보를 먼저 설정하세요');
      return;
    }

    // 파일 검증
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드 가능합니다');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('파일 크기는 10MB 이하여야 합니다');
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadImage(file, currentStore.store_id);
      setUploadedImage(result);
      setUploadError(null);
      console.log('이미지 업로드 성공:', result);
    } catch (error) {
      setUploadError(error.message || '이미지 업로드에 실패했습니다');
      setUploadedImage(null);
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setUploadError(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 좌측: 이미지 업로드 */}
      <div>
        <h2 className="text-2xl font-bold mb-2 text-[#151D48]">영상 생성하기</h2>

        {/* 가게 정보 표시 */}
        {currentStore && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-sm text-blue-700">
              현재 가게: <strong>{currentStore.store_name}</strong>
              {currentStore.category && ` (${currentStore.category})`}
            </p>
          </div>
        )}

        {/* 가게 정보 로드 에러 */}
        {storeError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">{storeError}</p>
          </div>
        )}

        {!uploadedImage ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
              dragActive
                ? 'border-[#5D5FEF] bg-[#5D5FEF]/5'
                : 'border-[#D1D5E0] bg-white'
            }`}
          >
            <Upload
              size={48}
              className={`mx-auto mb-4 ${
                dragActive ? 'text-[#5D5FEF]' : 'text-[#999CAA]'
              }`}
            />

            <h3 className="text-lg font-semibold mb-2 text-[#151D48]">
              이미지를 업로드하세요
            </h3>

            <p className="text-sm text-[#666D80] mb-6">
              드래그앤드롭으로 업로드하거나 아래 버튼을 클릭하세요
            </p>

            <label className="inline-block">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                disabled={isUploading || !currentStore}
                className="hidden"
              />
              <button
                onClick={(e) => {
                  if (currentStore) {
                    e.currentTarget.parentElement.querySelector('input').click();
                  }
                }}
                disabled={isUploading || !currentStore}
                className="px-6 py-3 bg-[#5D5FEF] text-white font-bold rounded-2xl hover:bg-[#5D5FEF]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? '업로드 중...' : '파일 선택'}
              </button>
            </label>

            {isUploading && (
              <div className="mt-4">
                <div className="w-full bg-[#D1D5E0] rounded-full h-2">
                  <div
                    className="bg-[#5D5FEF] h-2 rounded-full animate-pulse"
                    style={{ width: '60%' }}
                  ></div>
                </div>
                <p className="text-sm text-[#666D80] mt-2">업로드 중...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8">
            <div className="relative mb-6">
              <img
                src={uploadedImage.url}
                alt="업로드된 이미지"
                className="w-full h-auto rounded-2xl max-h-96 object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-[#151D48] mb-2">
                {uploadedImage.original_filename}
              </h3>
              <p className="text-sm text-[#666D80] mb-2">
                크기: {(uploadedImage.file_size / 1024).toFixed(2)} KB
              </p>
              <p className="text-xs text-[#999CAA] mb-6">
                이미지 ID: {uploadedImage.image_id}
              </p>

              <button
                className="w-full px-6 py-3 bg-[#5D5FEF] text-white font-bold rounded-2xl hover:bg-[#5D5FEF]/90 transition-all"
              >
                다음 단계로
              </button>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        )}
      </div>

      {/* 우측: Phase 8 캠페인 기획 (항상 표시) */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#151D48]">캠페인 기획</h2>

        <div className="bg-white rounded-3xl p-8 space-y-8">
          {/* 프로모션 목적 */}
          <div>
            <h3 className="text-lg font-bold text-[#151D48] mb-4">
              프로모션 목적
              <span className="text-sm font-normal text-[#999CAA] ml-2">(여러 개 선택 가능)</span>
            </h3>

            <div className="space-y-3">
              {purposeOptions.map(option => (
                <label key={option} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purpose.includes(option)}
                    onChange={() => handlePurposeToggle(option)}
                    className="w-5 h-5 rounded border-[#D1D5E0] accent-[#5D5FEF]"
                  />
                  <span className="ml-3 text-[#151D48]">{option}</span>
                </label>
              ))}
            </div>

            {purpose.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-700">
                  선택됨: <strong>{purpose.join(', ')}</strong>
                </p>
              </div>
            )}
          </div>

          {/* 비디오 무드 */}
          <div>
            <h3 className="text-lg font-bold text-[#151D48] mb-4">
              비디오 무드
              <span className="text-sm font-normal text-[#999CAA] ml-2">(1개 선택)</span>
            </h3>

            <div className="space-y-3">
              {moodOptions.map(option => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="mood"
                    value={option.value}
                    checked={mood === option.value}
                    onChange={e => setMood(e.target.value)}
                    className="w-5 h-5 border-[#D1D5E0] accent-[#5D5FEF]"
                  />
                  <span className="ml-3 text-[#151D48]">{option.label}</span>
                </label>
              ))}
            </div>

            {mood && (
              <div className="mt-4 p-3 bg-purple-50 rounded-xl">
                <p className="text-sm text-purple-700">
                  선택됨: <strong>{moodOptions.find(m => m.value === mood)?.label}</strong>
                </p>
              </div>
            )}
          </div>

          {/* 이미지 상태 안내 */}
          {!uploadedImage && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
              <p className="text-sm text-yellow-700">
                ⚠️ 좌측에서 이미지를 먼저 업로드해주세요
              </p>
            </div>
          )}

          {uploadedImage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
              <p className="text-sm text-green-700">
                ✅ 이미지 준비 완료! 캠페인 기획을 완성하세요.
              </p>
            </div>
          )}

          {/* 릴스 생성하기 버튼 */}
          <button
            onClick={handleStartGeneration}
            disabled={!uploadedImage || purpose.length === 0 || !mood}
            className={`w-full py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
              uploadedImage && purpose.length > 0 && mood
                ? 'bg-[#5D5FEF] hover:bg-[#4B4CE0] text-white shadow-[0_4px_10px_rgba(93,95,239,0.3)] cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
            }`}
          >
            🚀 릴스 생성하기
          </button>
        </div>
      </div>
    </div>
  );
}
