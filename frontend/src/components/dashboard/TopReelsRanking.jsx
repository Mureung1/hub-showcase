import { topReelsData } from '../../mocks/dashboardMock';

export default function TopReelsRanking() {
  return (
    <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <h3 className="text-lg font-bold text-[#151D48] mb-6">이번 달 인기 폭발 릴스 Top 3</h3>

      <div className="space-y-4">
        {topReelsData.map(reel => (
          <div key={reel.id} className="flex items-center gap-3">
            <div className="w-12 h-16 bg-[#E2E8F0] rounded-lg flex-shrink-0"></div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#151D48]">{reel.title}</div>
              <div className="text-xs text-[#737791]">조회수 {reel.views}</div>
              <div className="w-full h-1 bg-[#F1F3F9] rounded mt-2">
                <div
                  className="h-full bg-[#5D5FEF] rounded"
                  style={{ width: `${reel.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
