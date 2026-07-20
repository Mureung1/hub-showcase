import { useState, useEffect } from 'react';
import { getLatestStore } from '../api/client';
import ProfileCard from '../components/dashboard/ProfileCard';
import StatCard from '../components/dashboard/StatCard';
import CtrChart from '../components/dashboard/CtrChart';
import TrendTags from '../components/dashboard/TrendTags';
import TopReelsRanking from '../components/dashboard/TopReelsRanking';
import SentimentChart from '../components/dashboard/SentimentChart';
import PlatformChart from '../components/dashboard/PlatformChart';
import { statCardsData } from '../mocks/dashboardMock';

export default function Dashboard() {
  const [storeCategory, setStoreCategory] = useState('카페');

  useEffect(() => {
    async function fetchStoreCategory() {
      try {
        const response = await getLatestStore();
        console.log('[Dashboard] 조회한 카테고리:', response.data?.category);
        if (response.success && response.data?.category) {
          setStoreCategory(response.data.category);
        }
      } catch (err) {
        console.warn('가게 정보 조회 실패, 기본값 사용:', err);
      }
    }

    // 마운트 시에만 한 번 조회
    fetchStoreCategory();
  }, []);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#151D48]">대시보드</h1>
        <p className="text-[#737791] mt-2">가게 정보와 실시간 트렌드 분석</p>
        <p className="text-xs text-[#999CAA] mt-1">현재 카테고리: <strong>{storeCategory}</strong></p>
      </div>

      {/* 프로필 카드 */}
      <ProfileCard />

      {/* 4개 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCardsData.map(stat => (
          <StatCard
            key={stat.id}
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            color={stat.color}
          />
        ))}
      </div>

      {/* CTR 차트 + 트렌드 태그 (2열) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CtrChart />
        </div>
        <TrendTags category={storeCategory} />
      </div>

      {/* 3개 위젯 (3열) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TopReelsRanking />
        <SentimentChart />
        <PlatformChart />
      </div>
    </div>
  );
}
