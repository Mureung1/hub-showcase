import { Share2, Instagram, Play, Loader } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { publishVideo, getLatestStore } from '../api/client';

export default function Review() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPublishing, setIsPublishing] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [publishSuccess, setPublishSuccess] = useState(null);
  const [currentStore, setCurrentStore] = useState(null);

  // Mock 비디오 데이터 (Phase 9 완성 후 실제 데이터로 교체)
  const mockVideoData = {
    video_id: 1,
    video_url: 'https://via.placeholder.com/1080x1920?text=Sample+Video',
    thumbnail_url: 'https://via.placeholder.com/1080x1920?text=Thumbnail',
    title: '신메뉴 소개 영상',
    platform: 'instagram',
    stats: {
      views: 1200,
      clicks: 62,
      ctr: 5.2,
      likes: 245,
      comments: 18,
      shares: 12
    },
    hashtags: '#라떼 #신메뉴 #카페'
  };

  // 페이지 로드 시 가게 정보 조회
  useEffect(() => {
    const loadStore = async () => {
      try {
        const storeData = await getLatestStore();
        if (storeData.data) {
          setCurrentStore(storeData.data);
        }
      } catch (error) {
        console.error('가게 정보 로드 실패:', error);
      }
    };

    loadStore();
  }, []);

  const handlePublish = async (platform) => {
    if (!currentStore) {
      setPublishError('가게 정보를 찾을 수 없습니다. Setup에서 가게를 등록하세요.');
      return;
    }

    setIsPublishing(platform);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const result = await publishVideo({
        video_id: mockVideoData.video_id,
        video_url: mockVideoData.video_url,
        platform: platform.toLowerCase(),
        store_id: currentStore.store_id,
        hashtags: mockVideoData.hashtags,
        title: mockVideoData.title
      });

      setPublishSuccess(`${platform}에 발행 완료! (Post ID: ${result.data.post_id})`);
      console.log(`${platform} 발행 성공:`, result);

      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        setPublishSuccess(null);
      }, 3000);
    } catch (error) {
      setPublishError(error.message || `${platform} 발행에 실패했습니다`);
      console.error(`${platform} 발행 오류:`, error);
    } finally {
      setIsPublishing(null);
    }
  };

  const handleGoBack = () => {
    navigate('/generate');
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#151D48]">영상 발행</h1>
          <p className="text-[#737791] mt-2">생성된 영상을 확인하고 발행하세요</p>
          {currentStore && (
            <p className="text-xs text-[#999CAA] mt-2">
              가게: <strong>{currentStore.store_name}</strong> ({currentStore.category})
            </p>
          )}
        </div>

        {/* 상태 메시지 */}
        {publishSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <p className="text-sm text-green-700">✅ {publishSuccess}</p>
          </div>
        )}

        {publishError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-700">❌ {publishError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 좌측: 비디오 미리보기 */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              {/* 비디오 플레이어 */}
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video mb-6 flex items-center justify-center group">
                <img
                  src={mockVideoData.thumbnail_url}
                  alt="Video Thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <Play
                    size={64}
                    className="text-white opacity-80 group-hover:opacity-100 transition-opacity"
                    fill="white"
                  />
                </div>
              </div>

              {/* 비디오 정보 */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-[#151D48]">
                    {mockVideoData.title}
                  </h2>
                  <p className="text-sm text-[#737791] mt-2">
                    {mockVideoData.hashtags}
                  </p>
                </div>

                {/* 통계 */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#F1F3F9]">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#5D5FEF]">
                      {mockVideoData.stats.views.toLocaleString()}
                    </p>
                    <p className="text-xs text-[#737791] mt-1">조회수</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#F59E0B]">
                      {mockVideoData.stats.ctr}%
                    </p>
                    <p className="text-xs text-[#737791] mt-1">클릭율 (CTR)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#10B981]">
                      {mockVideoData.stats.clicks}
                    </p>
                    <p className="text-xs text-[#737791] mt-1">클릭수</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#EC4899]">
                      {mockVideoData.stats.likes}
                    </p>
                    <p className="text-xs text-[#737791] mt-1">좋아요</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 뒤로가기 버튼 */}
            <button
              onClick={handleGoBack}
              className="w-full py-3 border border-[#D1D5E0] text-[#151D48] font-bold rounded-2xl hover:bg-[#F4F7FE] transition-all"
            >
              ← 돌아가기
            </button>
          </div>

          {/* 우측: 발행 옵션 */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-6">
              <h3 className="text-lg font-bold text-[#151D48]">
                소셜 미디어 발행
              </h3>

              {/* Instagram */}
              <div className="border-2 border-[#F1F3F9] rounded-2xl p-6 hover:border-[#5D5FEF] transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#F59E0B] to-[#EC4899] rounded-full flex items-center justify-center">
                      <Instagram size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-[#151D48]">Instagram</p>
                      <p className="text-xs text-[#737791]">Reels 자동 발행</p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    준비됨
                  </span>
                </div>

                <div className="space-y-3 mb-4 p-3 bg-[#F4F7FE] rounded-xl">
                  <p className="text-sm text-[#737791]">
                    <strong>자동 설정:</strong>
                  </p>
                  <ul className="text-sm text-[#737791] space-y-1">
                    <li>• 9:16 비율로 자동 최적화</li>
                    <li>• 해시태그 자동 추가</li>
                    <li>• 자막 포함</li>
                  </ul>
                </div>

                <button
                  onClick={() => handlePublish('Instagram')}
                  disabled={isPublishing === 'Instagram' || !currentStore}
                  className={`w-full py-3 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
                    isPublishing === 'Instagram' || !currentStore
                      ? 'bg-gray-400 cursor-not-allowed opacity-70'
                      : 'bg-gradient-to-r from-[#F59E0B] to-[#EC4899] hover:opacity-90'
                  }`}
                >
                  {isPublishing === 'Instagram' ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      발행 중...
                    </>
                  ) : (
                    <>📱 Instagram에 발행</>
                  )}
                </button>
              </div>

              {/* TikTok */}
              <div className="border-2 border-[#F1F3F9] rounded-2xl p-6 hover:border-[#5D5FEF] transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#000000] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">♪</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#151D48]">TikTok</p>
                      <p className="text-xs text-[#737791]">자동 발행</p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    준비됨
                  </span>
                </div>

                <div className="space-y-3 mb-4 p-3 bg-[#F4F7FE] rounded-xl">
                  <p className="text-sm text-[#737791]">
                    <strong>자동 설정:</strong>
                  </p>
                  <ul className="text-sm text-[#737791] space-y-1">
                    <li>• 트렌디한 음악 추가</li>
                    <li>• 해시태그 최적화</li>
                    <li>• 썸네일 자동 생성</li>
                  </ul>
                </div>

                <button
                  onClick={() => handlePublish('TikTok')}
                  disabled={isPublishing === 'TikTok' || !currentStore}
                  className={`w-full py-3 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
                    isPublishing === 'TikTok' || !currentStore
                      ? 'bg-gray-400 cursor-not-allowed opacity-70'
                      : 'bg-[#000000] hover:bg-gray-800'
                  }`}
                >
                  {isPublishing === 'TikTok' ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      발행 중...
                    </>
                  ) : (
                    <>🎵 TikTok에 발행</>
                  )}
                </button>
              </div>

              {/* 추가 옵션 */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex gap-3">
                  <Share2 size={20} className="text-blue-700 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      💡 팁: 최적의 시간에 발행하세요
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      평일 오후 6-8시, 주말 오후 1-3시가 가장 인기 있습니다
                    </p>
                  </div>
                </div>
              </div>

              {/* Mock 데이터 안내 */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
                <p className="text-xs text-yellow-700">
                  ⚠️ <strong>현재는 Mock 데이터입니다.</strong> Phase 9 AI 파이프라인 완성 후 실제 생성된 영상으로 변경됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
