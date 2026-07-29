import { Navigate, useNavigate } from "react-router-dom";
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
import { useBlogAnalysis } from "../hooks/useBlogAnalysis";
import { apiClient } from "../api/client";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(isoDate) {
  if (!isoDate) return null;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / DAY_MS);
}

function Dashboard() {
  const navigate = useNavigate();
  const { data: brandProfile, error: brandProfileError } = useBrandProfile();
  const { data: briefing, error: briefingError } = useBriefing();
  const { data: insight, error: insightError } = useInsights();
  const { data: posts, error: postsError, refetch: refetchPosts } = usePosts();
  const { data: blogAnalysis, error: blogAnalysisError } = useBlogAnalysis();

  if (brandProfileError?.code === "BRAND_PROFILE_NOT_FOUND") {
    return <Navigate to="/onboarding" replace />;
  }

  const error = brandProfileError ?? briefingError ?? insightError ?? postsError ?? blogAnalysisError;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-error">
        {error.message}
      </div>
    );
  }

  if (!brandProfile || !briefing || !insight || !posts || !blogAnalysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-on-surface-variant">
        불러오는 중...
      </div>
    );
  }

  const deletePostRecord = async (id) => {
    try {
      await apiClient.delete(`/posts/${id}`);
      refetchPosts();
    } catch (err) {
      window.alert(err.message);
    }
  };

  // 반자동 발행 이후에는 우리 DB와 실제 네이버 게시 상태가 자동으로 동기화되지
  // 않는다 — 네이버 쪽에서 글을 지운 경우 여기서 직접 지워서 목록을 정리한다.
  const handleDeletePost = (id) => {
    if (!window.confirm("이 게시물 기록을 삭제할까요? 네이버에 올라간 글 자체는 지워지지 않아요.")) return;
    deletePostRecord(id);
  };

  // publishedUrl을 서버가 직접 요청해서 네이버에서 삭제됐는지 확인한다 —
  // 확정적인 판별은 아니라서 결과를 그대로 믿지 않고 항상 사용자 확인을 거친다.
  const handleCheckDeleted = async (post) => {
    try {
      const { result } = await apiClient.get(`/posts/${post.id}/check-deleted`);
      if (result === "deleted") {
        if (window.confirm("네이버에서 삭제된 것 같아요. 목록에서도 지울까요?")) {
          await deletePostRecord(post.id);
        }
      } else if (result === "exists") {
        window.alert("아직 네이버에 남아있어요.");
      } else {
        window.alert("확인할 수 없었어요. 네이버에서 직접 확인해주세요.");
      }
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <TopBar storeName={brandProfile.storeName} />

      <main className="max-w-[1440px] mx-auto px-container-margin py-xl flex flex-col md:flex-row gap-xl">
        <aside className="w-full md:w-[30%] flex flex-col gap-xl">
          <BlogHealthCard
            score={insight.healthScore.total}
            level={insight.healthScore.level}
            daysSinceLastPost={blogAnalysis.connected ? daysSince(blogAnalysis.latestPostDate) : null}
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

          <RecentPostsList
            posts={posts}
            onViewAll={() => {}}
            onDelete={handleDeletePost}
            onCheckDeleted={handleCheckDeleted}
          />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
