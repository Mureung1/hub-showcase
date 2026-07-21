import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import BlogHealthCard from "../components/BlogHealthCard";
import BrandSummaryCard from "../components/BrandSummaryCard";
import BriefingCard from "../components/BriefingCard";
import ActionCard from "../components/ActionCard";
import RecentPostsList from "../components/RecentPostsList";
import { useBrandProfile } from "../hooks/useBrandProfile";
import { useBriefing } from "../hooks/useBriefing";
import { useInsights } from "../hooks/useInsights";
import { usePosts } from "../hooks/usePosts";

function Dashboard() {
  const navigate = useNavigate();
  const { data: brandProfile, error: brandProfileError } = useBrandProfile();
  const { data: briefing, error: briefingError } = useBriefing();
  const { data: insight, error: insightError } = useInsights();
  const { data: posts, error: postsError } = usePosts();

  const error = brandProfileError ?? briefingError ?? insightError ?? postsError;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-error">
        {error.message}
      </div>
    );
  }

  if (!brandProfile || !briefing || !insight || !posts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-on-surface-variant">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopBar storeName={brandProfile.storeName} />

      <main className="max-w-[1440px] mx-auto px-container-margin py-xl flex flex-col md:flex-row gap-xl">
        <aside className="w-full md:w-[30%] flex flex-col gap-xl">
          <BlogHealthCard
            score={insight.healthScore.total}
            level={insight.healthScore.level}
            daysSinceLastPost={briefing.daysSinceLastPost}
            visitorCount={insight.healthScore.visitorCount}
            onDetail={() => {}}
          />
          <BrandSummaryCard
            summary={brandProfile.summary}
            keywords={brandProfile.keywords}
            onViewProfile={() => {}}
          />
        </aside>

        <div className="w-full md:w-[70%] flex flex-col gap-xl">
          <BriefingCard
            reason={briefing.reason}
            recommendedTopic={briefing.recommendedTopic}
            expectedEffect={briefing.expectedEffect}
            onStart={() => navigate("/posts/promotion/new")}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            <ActionCard
              variant="primary"
              icon="edit_note"
              title="홍보글 작성"
              description="AI와 대화하며 브랜드에 맞는 홍보글을 작성합니다."
              actionLabel="작성하기"
              onAction={() => navigate("/posts/promotion/new")}
            />
            <ActionCard
              variant="secondary"
              icon="campaign"
              title="공지사항 작성"
              description="휴무, 품절 등의 공지를 빠르게 작성합니다."
              actionLabel="작성하기"
              onAction={() => navigate("/posts/notice/new")}
            />
          </div>

          <RecentPostsList posts={posts} onViewAll={() => {}} />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
