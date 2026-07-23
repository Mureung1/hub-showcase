import { useState, useEffect } from 'react';
import { Upload, Check, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  uploadImage,
  getLatestStore,
  getUploadedImages,
  deleteImage,
  startGeneration,
  pollGenerationStatus
} from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import SuccessBanner from '../components/SuccessBanner';

export default function Generate() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStore, setCurrentStore] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [storeError, setStoreError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // 파이프라인 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationJobId, setGenerationJobId] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationSteps, setGenerationSteps] = useState([]);
  const [generationError, setGenerationError] = useState(null);

  // 캠페인 플래닝
  const [purpose, setPurpose] = useState([]);
  const [mood, setMood] = useState('');

  // 선택된 트렌드 (Dashboard에서 전달)
  const [selectedTrend, setSelectedTrend] = useState(
    location.state?.trend_hashtag || '#신메뉴'
  );

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

  const handleStartGeneration = async () => {
    if (!selectedImageId) {
      setGenerationError('이미지를 먼저 선택하세요');
      return;
    }
    if (purpose.length === 0) {
      setGenerationError('프로모션 목적을 최소 1개 이상 선택하세요');
      return;
    }
    if (!mood) {
      setGenerationError('비디오 무드를 선택하세요');
      return;
    }

    setIsGenerating(true);
    setGenerationJobId(null);
    setGenerationProgress(0);
    setGenerationSteps([]);
    setGenerationError(null);

    try {
      // 1. 파이프라인 시작
      const selectedImage = uploadedImages.find(img => img.image_id === selectedImageId);
      if (!selectedImage) {
        setUploadError('선택된 이미지를 찾을 수 없습니다');
        setIsGenerating(false);
        return;
      }

      console.log('영상 생성 시작:', {
        store_id: currentStore.store_id,
        trend_hashtag: selectedTrend,
        purpose: purpose.join(', '),
        mood
      });

      const result = await startGeneration(
        currentStore.store_id,
        selectedImage.url,
        selectedTrend,
        purpose.join(', '),
        mood
      );

      const jobId = result.job_id;
      setGenerationJobId(jobId);
      console.log('생성 시작:', jobId);

      // 2. 폴링 시작 (1초마다)
      const pollInterval = setInterval(async () => {
        try {
          const status = await pollGenerationStatus(jobId);

          setGenerationProgress(status.progress);
          setGenerationSteps(status.steps || []);

          console.log(`[${status.progress}%] ${status.status}`);

          // 완료되면 폴링 중단
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setIsGenerating(false);
            console.log('생성 완료!');

            // Review 페이지로 이동
            setTimeout(() => {
              navigate('/review', { state: { jobId } });
            }, 1000);
          }

          // 실패하면 폴링 중단
          if (status.status === 'failed') {
            clearInterval(pollInterval);
            setIsGenerating(false);
            setGenerationError(status.error || '영상 생성 중 오류가 발생했습니다');
            console.error('생성 실패:', status.error);
          }
        } catch (error) {
          console.error('폴링 오류:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Generation 오류:', error);
      setGenerationError(error.message || '영상 생성을 시작할 수 없습니다');
      setIsGenerating(false);
    }
  };

  // 페이지 마운트 시 현재 가게 정보 및 업로드된 이미지 로드
  useEffect(() => {
    const loadStore = async () => {
      try {
        const storeData = await getLatestStore();
        if (storeData.data) {
          setCurrentStore(storeData.data);
          setStoreError(null);

          // 이미지 목록 로드
          try {
            const images = await getUploadedImages(storeData.data.store_id);
            setUploadedImages(images || []);
            if (images && images.length > 0) {
              setSelectedImageId(images[0].image_id);
            }
          } catch (imgError) {
            console.warn('이미지 로드 실패:', imgError);
            setUploadedImages([]);
          }
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
      await uploadImage(file, currentStore.store_id);
      setUploadError(null);
      console.log('이미지 업로드 성공');

      // 업로드된 이미지 목록 새로 로드
      const images = await getUploadedImages(currentStore.store_id);
      setUploadedImages(images || []);
      if (images && images.length > 0) {
        setSelectedImageId(images[images.length - 1].image_id);
      }
    } catch (error) {
      setUploadError(error.message || '이미지 업로드에 실패했습니다');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteImage(imageId);
      console.log('이미지 삭제 완료');

      // 이미지 목록 새로 로드
      if (currentStore) {
        const images = await getUploadedImages(currentStore.store_id);
        setUploadedImages(images || []);

        // 삭제된 이미지가 선택되었으면 첫 번째 이미지 선택
        if (selectedImageId === imageId) {
          if (images && images.length > 0) {
            setSelectedImageId(images[0].image_id);
          } else {
            setSelectedImageId(null);
          }
        }
      }
    } catch (error) {
      alert('이미지 삭제 실패: ' + error.message);
      console.error('Delete error:', error);
    }
  };

  // 파이프라인 실행 중이면 진행 상황 표시
  if (isGenerating && generationJobId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-3xl font-bold mb-8 text-[#151D48]">🚀 영상 생성 중...</h2>

        {/* 전체 진행률 */}
        <div className="w-full max-w-md mb-10">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-[#151D48]">전체 진행률</span>
            <span className="text-sm font-bold text-[#5D5FEF]">{generationProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-[#5D5FEF] h-4 transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            ></div>
          </div>
        </div>

        {/* 각 Step별 진행 상황 */}
        <div className="w-full max-w-md space-y-3 mb-8">
          {generationSteps && generationSteps.map((step, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                step.status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : step.status === 'in_progress'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {step.status === 'completed' ? '✅' : step.status === 'in_progress' ? '⏳' : '⭕'}
                  </span>
                  <span className="font-semibold text-sm text-[#151D48]">{step.name}</span>
                </div>
              </div>
              {step.duration && (
                <p className="text-xs text-[#999CAA] mt-1">소요시간: {step.duration}초</p>
              )}
            </div>
          ))}
        </div>

        {/* 예상 남은 시간 */}
        <p className="text-sm text-[#666D80]">
          약 {Math.max(5, 45 - generationProgress)}초 남았습니다...
        </p>

        {/* 에러 표시 */}
        {generationError && (
          <div className="w-full max-w-md mt-8 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">❌ {generationError}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 좌측: 이미지 업로드 */}
      <div>
        <h2 className="text-2xl font-bold mb-2 text-[#151D48]">영상 생성하기</h2>

        {/* 에러 배너 */}
        <ErrorBanner
          message={uploadError || generationError || storeError}
          onClose={() => {
            setUploadError(null);
            setGenerationError(null);
            setStoreError(null);
          }}
          autoClose={true}
        />

        {/* 선택된 트렌드 표시 */}
        {selectedTrend && (
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-2xl">
            <p className="text-sm text-purple-700">
              선택된 트렌드: <strong className="text-lg">{selectedTrend}</strong>
            </p>
          </div>
        )}

        {/* 가게 정보 표시 */}
        {currentStore && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-sm text-blue-700">
              현재 가게: <strong>{currentStore.store_name}</strong>
              {currentStore.category && ` (${currentStore.category})`}
            </p>
          </div>
        )}

        {/* 이미지 업로드 영역 */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all mb-6 ${
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

        {/* 이미지 갤러리 */}
        {uploadedImages.length > 0 && (
          <div className="space-y-6">
            {/* 선택된 이미지 크게 미리보기 */}
            {selectedImageId && (() => {
              const selectedImage = uploadedImages.find(img => img.image_id === selectedImageId);
              return selectedImage ? (
                <div className="bg-white rounded-3xl p-6 shadow-md">
                  <h3 className="text-lg font-bold text-[#151D48] mb-4">선택된 이미지</h3>
                  <img
                    src={selectedImage.url}
                    alt="선택된 이미지"
                    className="w-full h-auto rounded-2xl max-h-96 object-cover mb-4"
                  />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#151D48] mb-1">
                      {selectedImage.original_filename}
                    </p>
                    <p className="text-xs text-[#666D80]">
                      크기: {(selectedImage.file_size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              ) : null;
            })()}

            {/* 이미지 갤러리 */}
            <div className="bg-white rounded-3xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-[#151D48] mb-4">
                업로드된 이미지 ({uploadedImages.length}개)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {uploadedImages.map(image => (
                  <div key={image.image_id} className="relative group">
                    <button
                      onClick={() => setSelectedImageId(image.image_id)}
                      className={`relative w-full rounded-2xl overflow-hidden transition-all ${
                        selectedImageId === image.image_id
                          ? 'ring-4 ring-[#5D5FEF]'
                          : 'ring-1 ring-gray-200 hover:ring-2 hover:ring-[#5D5FEF]/50'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.original_filename}
                        className="w-full h-32 object-cover"
                      />
                      {selectedImageId === image.image_id && (
                        <div className="absolute inset-0 bg-[#5D5FEF]/20 flex items-center justify-center">
                          <div className="bg-[#5D5FEF] text-white p-2 rounded-full">
                            <Check size={20} />
                          </div>
                        </div>
                      )}
                    </button>

                    {/* 삭제 버튼 (호버할 때만 표시) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.image_id);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="이미지 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
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
          {uploadedImages.length === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
              <p className="text-sm text-yellow-700">
                ⚠️ 좌측에서 이미지를 먼저 업로드해주세요
              </p>
            </div>
          )}

          {selectedImageId && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
              <p className="text-sm text-green-700">
                ✅ 이미지 준비 완료! 캠페인 기획을 완성하세요.
              </p>
            </div>
          )}

          {/* 릴스 생성하기 버튼 */}
          <button
            onClick={handleStartGeneration}
            disabled={!selectedImageId || purpose.length === 0 || !mood}
            className={`w-full py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
              selectedImageId && purpose.length > 0 && mood
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
