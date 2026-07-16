import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLatestStore } from '../api/client';

export default function Archive() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStore, setCurrentStore] = useState(null);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Mock 영상 데이터
  const mockVideos = [
    {
      video_id: 1,
      thumbnail_url: 'https://via.placeholder.com/300x400?text=Video+1',
      caption: '신메뉴 카페 라떼 소개',
      platform: 'instagram',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      stats: {
        views: 1200,
        clicks: 62,
        ctr: 5.2,
        likes: 245
      }
    },
    {
      video_id: 2,
      thumbnail_url: 'https://via.placeholder.com/300x400?text=Video+2',
      caption: '할인 이벤트 안내',
      platform: 'tiktok',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      stats: {
        views: 2500,
        clicks: 150,
        ctr: 6.0,
        likes: 380
      }
    },
    {
      video_id: 3,
      thumbnail_url: 'https://via.placeholder.com/300x400?text=Video+3',
      caption: '가게 분위기 소개',
      platform: 'instagram',
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000),
      stats: {
        views: 890,
        clicks: 45,
        ctr: 5.1,
        likes: 156
      }
    }
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 가게 정보 로드
        const storeData = await getLatestStore();
        if (storeData.data) {
          setCurrentStore(storeData.data);
        }

        // Mock 데이터 로드
        setVideos(mockVideos);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        setVideos(mockVideos);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 필터링 및 정렬
  const filteredVideos = videos
    .filter(v => filterPlatform === 'all' || v.platform === filterPlatform)
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (sortBy === 'views') {
        return b.stats.views - a.stats.views;
      }
      return 0;
    });

  const handleDelete = (videoId) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      setVideos(videos.filter(v => v.video_id !== videoId));
    }
  };

  const handleView = (video) => {
    navigate('/review', { state: { video } });
  };

  const handleRePublish = (video) => {
    alert(`${video.platform}에 재발행 준비 중...`);
  };

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-[#151D48]">보관함</h1>
        <p className="text-[#737791] mt-2">생성한 영상을 관리하세요</p>
        {currentStore && (
          <p className="text-xs text-[#999CAA] mt-1">
            가게: <strong>{currentStore.store_name}</strong>
          </p>
        )}
      </div>

      {/* 필터 & 정렬 */}
      <div className="bg-white rounded-3xl p-6 shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 플랫폼 필터 */}
          <div>
            <label className="block text-sm font-semibold text-[#151D48] mb-3">
              플랫폼
            </label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="w-full rounded-xl px-4 py-3 border border-[#F1F3F9] bg-white text-[#151D48] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]"
            >
              <option value="all">전체</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>

          {/* 정렬 */}
          <div>
            <label className="block text-sm font-semibold text-[#151D48] mb-3">
              정렬
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl px-4 py-3 border border-[#F1F3F9] bg-white text-[#151D48] focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="views">조회수순</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-[#737791]">
          총 <strong>{filteredVideos.length}</strong>개의 영상
        </p>
      </div>

      {/* 영상 목록 */}
      {loading ? (
        <div className="text-center py-20">
          <p className="text-[#737791]">로딩 중...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow-md text-center">
          <p className="text-[#737791] mb-2">생성된 영상이 없습니다</p>
          <button
            onClick={() => navigate('/generate')}
            className="mt-4 px-6 py-2 bg-[#5D5FEF] text-white rounded-xl font-semibold hover:bg-[#4B4CE0] transition-all"
          >
            지금 생성하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div key={video.video_id} className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-lg transition-all">
              {/* 썸네일 */}
              <div className="relative bg-black aspect-video overflow-hidden group">
                <img
                  src={video.thumbnail_url}
                  alt={video.caption}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleView(video)}
                    className="bg-[#5D5FEF] text-white p-3 rounded-full hover:bg-[#4B4CE0] transition-all"
                    title="상세 보기"
                  >
                    <Eye size={20} />
                  </button>
                  <button
                    onClick={() => handleRePublish(video)}
                    className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600 transition-all"
                    title="재발행"
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(video.video_id)}
                    className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-all"
                    title="삭제"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* 플랫폼 배지 */}
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                    video.platform === 'instagram'
                      ? 'bg-gradient-to-r from-[#F59E0B] to-[#EC4899]'
                      : 'bg-[#000000]'
                  }`}>
                    {video.platform === 'instagram' ? 'Instagram' : 'TikTok'}
                  </span>
                </div>
              </div>

              {/* 정보 */}
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-[#151D48] line-clamp-2">
                  {video.caption}
                </h3>

                <p className="text-xs text-[#737791]">
                  {new Date(video.created_at).toLocaleDateString('ko-KR')}
                </p>

                {/* 통계 */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F3F9]">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#5D5FEF]">
                      {video.stats.views.toLocaleString()}
                    </p>
                    <p className="text-xs text-[#737791]">조회</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#F59E0B]">
                      {video.stats.ctr}%
                    </p>
                    <p className="text-xs text-[#737791]">CTR</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
