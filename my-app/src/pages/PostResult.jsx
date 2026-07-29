import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageTopBar from "../components/PageTopBar";
import AISummaryCard from "../components/post-result/AISummaryCard";
import TagListCard from "../components/post-result/TagListCard";
import ThumbnailCard from "../components/post-result/ThumbnailCard";
import PostEditor from "../components/post-result/PostEditor";
import { usePostResult } from "../hooks/usePostResult";

// 서버 Post.content는 규칙 기반으로 생성된 순수 문자열이라(구조화된 문단/제목
// 블록이 아님), 줄바꿈 단위로 문단 블록화해서 PostEditor에 그대로 넣어준다.
function toContentBlocks(content) {
  return content.split("\n").map((line) => ({ type: "paragraph", parts: [{ text: line }] }));
}

function PostResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { data: post, error } = usePostResult(id);
  const photoFile = location.state?.photoFile ?? null;
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);

  // 인터뷰에서 업로드한 사진은 서버에 저장되지 않고 이 화면까지 router state로만
  // 전달된다(새로고침하면 사라짐) — 백엔드 이미지 업로드가 아직 없어서다.
  useEffect(() => {
    if (!photoFile) return undefined;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-error">
        {error.message}
      </div>
    );
  }

  if (!post) {
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
          <TagListCard title="추천 키워드" icon="trending_up" variant="seo" tags={post.seoKeywords} />
          <TagListCard title="추천 해시태그" variant="hashtag" tags={post.hashtags} />
          <ThumbnailCard
            thumbnail={{
              url: photoPreviewUrl ?? post.thumbnailUrl,
              note: photoPreviewUrl
                ? "업로드한 사진이에요. 네이버에 게시할 때 본문과 함께 복사됩니다."
                : "사진을 업로드하면 추천 썸네일을 보여드려요.",
            }}
          />
        </aside>

        <PostEditor
          title={post.title}
          content={toContentBlocks(post.content)}
          onRegenerate={() => {}}
          onSchedule={() => navigate(`/posts/promotion/schedule/${post.id}`, { state: { photoFile } })}
        />
      </main>
    </div>
  );
}

export default PostResult;
