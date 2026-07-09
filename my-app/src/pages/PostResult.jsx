import { useNavigate } from "react-router-dom";
import PageTopBar from "../components/PageTopBar";
import AISummaryCard from "../components/post-result/AISummaryCard";
import TagListCard from "../components/post-result/TagListCard";
import ThumbnailCard from "../components/post-result/ThumbnailCard";
import AIExplanationCard from "../components/post-result/AIExplanationCard";
import PostEditor from "../components/post-result/PostEditor";
import { usePostResult } from "../hooks/usePostResult";

function PostResult() {
  const navigate = useNavigate();
  const { data: result } = usePostResult();

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-on-surface-variant">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <PageTopBar
        storeName="OO카페"
        title="AI 홍보글 생성 결과"
        onBack={() => navigate(-1)}
      />

      <main className="max-w-[1440px] mx-auto px-container-margin pt-24 pb-xl flex flex-col md:flex-row gap-xl">
        <aside className="w-full md:w-[30%] flex flex-col gap-lg">
          <AISummaryCard />
          <TagListCard title="추천 키워드" icon="trending_up" variant="seo" tags={result.seoKeywords} />
          <TagListCard title="추천 해시태그" variant="hashtag" tags={result.hashtags} />
          <ThumbnailCard thumbnail={result.thumbnail} />
          <AIExplanationCard reasons={result.aiReasons} expectedEffect={result.expectedEffect} />
        </aside>

        <PostEditor
          title={result.title}
          content={result.content}
          photoLayout={result.photoLayout}
          onRegenerate={() => {}}
          onSchedule={() => navigate("/posts/promotion/schedule")}
        />
      </main>
    </div>
  );
}

export default PostResult;
