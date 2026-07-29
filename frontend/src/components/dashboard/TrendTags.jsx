import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getTrends } from '../../api/client';
import { colorMap, trendTagsData as fallbackTags } from '../../mocks/dashboardMock';

const colorOrder = ['pink', 'orange', 'green', 'purple'];

export default function TrendTags({ category = '카페' }) {
  const navigate = useNavigate();
  const [trends, setTrends] = useState([]);
  const [selectedTrendIndex, setSelectedTrendIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // AbortController로 이전 요청 취소
    const abortController = new AbortController();
    let isMounted = true;

    async function fetchTrends() {
      try {
        console.log(`[TrendTags] 트렌드 조회 시작 - 카테고리: ${category}`);
        setLoading(true);
        const response = await getTrends(category);

        // 컴포넌트가 언마운트되었거나 요청이 취소되면 상태 업데이트 하지 않음
        if (!isMounted || abortController.signal.aborted) {
          console.log('[TrendTags] 요청이 취소되었거나 컴포넌트가 언마운트됨');
          return;
        }

        if (response.success && response.data && response.data.length > 0) {
          console.log(`[TrendTags] 트렌드 조회 성공 - ${response.data.length}개 항목`);
          setTrends(response.data);
        } else {
          // 데이터가 없으면 mock 데이터 사용
          console.warn('트렌드 데이터가 없습니다. mock 데이터를 사용합니다.');
          setTrends(fallbackTags);
        }
      } catch (err) {
        // AbortError는 의도된 취소이므로 에러로 표시하지 않음
        if (err.name === 'AbortError') {
          console.log('[TrendTags] 요청이 의도적으로 취소됨');
          return;
        }
        console.error('트렌드 조회 실패:', err);
        if (isMounted) {
          setError(err.message);
          setTrends(fallbackTags);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchTrends();

    // cleanup: 컴포넌트 언마운트 또는 category 변경 시 이전 요청 취소
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [category]);

  const handleMakeTrendVideo = () => {
    const displayTrends = trends.length > 0 ? trends.slice(0, 4) : fallbackTags;
    const selectedTrend = displayTrends[selectedTrendIndex];

    if (!selectedTrend) {
      alert('선택된 트렌드가 없습니다');
      return;
    }

    const trendHashtag = selectedTrend.hashtag || selectedTrend.keyword || selectedTrend.tag || '#트렌드';

    console.log('선택된 트렌드:', trendHashtag);
    navigate('/generate', {
      state: { trend_hashtag: `#${trendHashtag}` }
    });
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
              const isSelected = selectedTrendIndex === idx;
              return (
                <button
                  key={item.keyword_id || item.id || idx}
                  onClick={() => setSelectedTrendIndex(idx)}
                  className={`px-4 py-2 rounded-full font-semibold text-sm transition-all cursor-pointer ${
                    isSelected
                      ? `${colors.bg} ${colors.text} ring-2 ring-offset-2 ring-[#5D5FEF]`
                      : `${colors.bg} ${colors.text} opacity-60 hover:opacity-100`
                  }`}
                >
                  #{displayText}
                </button>
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
