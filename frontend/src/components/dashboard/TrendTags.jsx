import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { getTrends } from '../../api/client';
import { colorMap, trendTagsData as fallbackTags } from '../../mocks/dashboardMock';

const colorOrder = ['pink', 'orange', 'green', 'purple'];

export default function TrendTags({ category = '카페' }) {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const response = await getTrends(category);
        if (response.success && response.data && response.data.length > 0) {
          setTrends(response.data);
        } else {
          // 데이터가 없으면 mock 데이터 사용
          console.warn('트렌드 데이터가 없습니다. mock 데이터를 사용합니다.');
          setTrends(fallbackTags);
        }
      } catch (err) {
        console.error('트렌드 조회 실패:', err);
        setError(err.message);
        setTrends(fallbackTags);
      } finally {
        setLoading(false);
      }
    }

    fetchTrends();
  }, [category]);

  const handleMakeTrendVideo = () => {
    console.log('트렌드로 영상 만들기 클릭됨 (Generate 페이지로 이동 예정)');
  };

  const displayTrends = trends.length > 0 ? trends.slice(0, 4) : fallbackTags;

  return (
    <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <h3 className="text-lg font-bold text-[#151D48] mb-6">오늘의 트렌드</h3>

      {loading ? (
        <div className="text-center py-8 text-[#737791]">로딩 중...</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-8">
            {displayTrends.map((item, idx) => {
              const colorKey = colorOrder[idx % colorOrder.length];
              const colors = colorMap[colorKey];
              const displayText = item.hashtag || item.keyword || item.tag || '트렌드';
              return (
                <span
                  key={item.keyword_id || item.id || idx}
                  className={`${colors.bg} ${colors.text} px-4 py-2 rounded-full font-semibold text-sm`}
                >
                  #{displayText}
                </span>
              );
            })}
          </div>

          <button
            onClick={handleMakeTrendVideo}
            className="w-full bg-[#5D5FEF] hover:bg-[#4B4CE0] text-white py-3 rounded-xl font-bold transition-all shadow-[0_4px_10px_rgba(93,95,239,0.3)] flex items-center justify-center gap-2"
          >
            이 트렌드로 영상 만들기
            <ChevronRight size={18} />
          </button>

          {error && <div className="text-xs text-[#FF5B5B] mt-3">경고: {error}</div>}
        </>
      )}
    </div>
  );
}
