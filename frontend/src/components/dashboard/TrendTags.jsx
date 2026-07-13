import { ChevronRight } from 'lucide-react';
import { trendTagsData, colorMap } from '../../mocks/dashboardMock';

export default function TrendTags() {
  const handleMakeTrendVideo = () => {
    console.log('트렌드로 영상 만들기 클릭됨 (Generate 페이지로 이동 예정)');
  };

  return (
    <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <h3 className="text-lg font-bold text-[#151D48] mb-6">오늘의 트렌드 태그</h3>

      <div className="flex flex-wrap gap-3 mb-8">
        {trendTagsData.map(item => {
          const colors = colorMap[item.color];
          return (
            <span
              key={item.id}
              className={`${colors.bg} ${colors.text} px-4 py-2 rounded-full font-semibold text-sm`}
            >
              {item.tag}
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
    </div>
  );
}
