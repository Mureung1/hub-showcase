import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopBar from "../components/PageTopBar";
import NoticeEditor from "../components/notice-result/NoticeEditor";
import PublishConfirmCard from "../components/schedule-publish/PublishConfirmCard";
import PublishExceptionBanner from "../components/schedule-publish/PublishExceptionBanner";
import { useNoticeResult } from "../hooks/useNoticeResult";
import { apiClient } from "../api/client";
import { NAVER_BLOG_WRITE_URL, publishToNaver } from "../lib/naverPublish";

function NoticeResult() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: result, error } = useNoticeResult(id);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isPublishSubmitting, setIsPublishSubmitting] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [clipboardFailed, setClipboardFailed] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-error">
        {error.message}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-on-surface-variant">
        불러오는 중...
      </div>
    );
  }

  // 반자동 발행: 제목+본문을 클립보드에 복사하고 네이버 블로그 글쓰기 페이지를
  // 새 탭으로 연다. 공지사항은 예약 없이 바로 게시하는 흐름이라 홍보글의
  // "예약 발행" 화면(SchedulePublish)을 거치지 않고 이 화면에서 바로 처리한다.
  const handlePublishNow = async () => {
    const { clipboardFailed: copyFailed, popupBlocked: blocked } = await publishToNaver(
      `${result.title}\n\n${result.content}`
    );
    setClipboardFailed(copyFailed);
    setPopupBlocked(blocked);
    setPublishError(null);
    setShowPublishConfirm(true);
  };

  const handleDetectPublished = () => apiClient.get(`/posts/${id}/detect-published`);

  const handleConfirmPublish = async (url) => {
    setIsPublishSubmitting(true);
    setPublishError(null);
    try {
      await apiClient.patch(`/posts/${id}`, {
        status: "published",
        publishedAt: new Date().toISOString(),
        publishedUrl: url.trim(),
      });
      navigate("/");
    } catch (err) {
      setPublishError(err.message);
      setIsPublishSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <PageTopBar
        storeName="OO카페"
        title="AI 공지사항 생성 결과"
        onBack={() => navigate(-1)}
      />

      <main className="flex-1 pt-24 pb-container-margin px-container-margin flex flex-col items-center">
        <div className="max-w-[750px] w-full flex flex-col items-center mb-lg text-center">
          <div className="w-20 h-20 mb-md relative">
            <div className="absolute inset-0 bg-secondary-fixed rounded-full opacity-20 animate-ping" />
            <div className="relative z-10 w-full h-full bg-secondary-container rounded-full flex items-center justify-center border-2 border-secondary">
              <span
                className="material-symbols-outlined text-on-secondary-container text-[40px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                smart_toy
              </span>
            </div>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">
            공지사항 작성이 완료되었습니다!
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            내용을 확인하고 게시해주세요. AI가 최적의 문구와 톤으로 작성했습니다.
          </p>
        </div>

        <NoticeEditor
          title={result.title}
          content={result.content}
          keywords={result.seoKeywords}
          onPublish={handlePublishNow}
        />

        {showPublishConfirm && (
          <div className="max-w-[750px] w-full flex flex-col gap-lg mt-lg">
            <PublishExceptionBanner
              clipboardFailed={clipboardFailed}
              popupBlocked={popupBlocked}
              publishText={`${result.title}\n\n${result.content}`}
              writeUrl={NAVER_BLOG_WRITE_URL}
            />
            <PublishConfirmCard
              onDetect={handleDetectPublished}
              onConfirm={handleConfirmPublish}
              onCancel={() => {
                setShowPublishConfirm(false);
                setClipboardFailed(false);
                setPopupBlocked(false);
              }}
              isSubmitting={isPublishSubmitting}
              error={publishError}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default NoticeResult;
