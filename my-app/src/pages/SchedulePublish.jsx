import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageTopBar from "../components/PageTopBar";
import HeroTimeCard from "../components/schedule-publish/HeroTimeCard";
import AIHelperCard from "../components/schedule-publish/AIHelperCard";
import ScheduleSummaryCard from "../components/schedule-publish/ScheduleSummaryCard";
import PreviewCard from "../components/schedule-publish/PreviewCard";
import ScheduleActions from "../components/schedule-publish/ScheduleActions";
import PublishConfirmCard from "../components/schedule-publish/PublishConfirmCard";
import PublishExceptionBanner from "../components/schedule-publish/PublishExceptionBanner";
import PhotoCopyCard from "../components/schedule-publish/PhotoCopyCard";
import { useSchedulePublish } from "../hooks/useSchedulePublish";
import { usePostResult } from "../hooks/usePostResult";
import { apiClient } from "../api/client";
import { NAVER_BLOG_WRITE_URL, publishToNaver } from "../lib/naverPublish";

const TARGET = "네이버 블로그";

// <input type="datetime-local">가 기대하는 "YYYY-MM-DDTHH:mm"(로컬 시간) 포맷으로 변환.
function toDateTimeLocalValue(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplay(dateTimeLocalValue) {
  const d = new Date(dateTimeLocalValue);
  return {
    date: `${d.getMonth() + 1}월 ${d.getDate()}일`,
    time: d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function SchedulePublish() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const photoFile = location.state?.photoFile ?? null;
  const { data: suggested, error } = useSchedulePublish(id);
  const { data: post, error: postError } = usePostResult(id);
  const [selected, setSelected] = useState(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isPublishSubmitting, setIsPublishSubmitting] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [clipboardFailed, setClipboardFailed] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);

  useEffect(() => {
    if (!photoFile) return undefined;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (!suggested || selected !== null) return;
    Promise.resolve().then(() => setSelected(toDateTimeLocalValue(suggested.datetime)));
  }, [suggested, selected]);

  if (error || postError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-error">
        {(error ?? postError).message}
      </div>
    );
  }

  if (!suggested || selected === null || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body-md text-body-md text-on-surface-variant">
        불러오는 중...
      </div>
    );
  }

  const suggestedDisplay = formatDisplay(toDateTimeLocalValue(suggested.datetime));
  const { date: publishDate, time: publishTime } = formatDisplay(selected);

  // 반자동 발행: 서버가 대신 게시하지 않고, 제목+본문을 클립보드에 복사한 뒤
  // 네이버 블로그 글쓰기 페이지를 새 탭으로 열어준다. 실제 게시(또는 네이버 자체
  // 예약 발행)는 사용자가 그 탭에서 직접 한다.
  const handlePublishNow = async () => {
    const { clipboardFailed: copyFailed, popupBlocked: blocked } = await publishToNaver(
      `${post.title}\n\n${post.content}`
    );
    setClipboardFailed(copyFailed);
    setPopupBlocked(blocked);
    setPublishError(null);
    setShowPublishConfirm(true);
  };

  // 네이버 RSS에서 이 글과 제목이 비슷한 최근 글을 찾아본다 — 못 찾을 수 있는
  // 휴리스틱이라 PublishConfirmCard가 항상 사용자 확인을 거치게 한다.
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
    <div className="min-h-screen bg-surface">
      <PageTopBar storeName="OO카페" title="예약 발행" onBack={() => navigate(-1)} />

      <main className="max-w-[1440px] mx-auto px-container-margin pt-24 pb-xl grid grid-cols-1 md:grid-cols-[35fr_65fr] gap-xl">
        <aside className="flex flex-col gap-xl">
          <HeroTimeCard day={suggestedDisplay.date} time={suggestedDisplay.time} reasons={[suggested.reason]} />
        </aside>

        <section className="flex flex-col gap-xl">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-xl">
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="publish-datetime">
                발행 일시
              </label>
              <input
                id="publish-datetime"
                type="datetime-local"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-sm focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>
            <div className="flex flex-col gap-xl">
              <AIHelperCard onApply={() => setSelected(toDateTimeLocalValue(suggested.datetime))} />
              <ScheduleSummaryCard publishDate={publishDate} publishTime={publishTime} target={TARGET} />
            </div>
          </div>

          <PreviewCard target={TARGET} title={post.title} content={post.content} imageUrl={photoPreviewUrl} />

          {showPublishConfirm && (
            <PublishExceptionBanner
              clipboardFailed={clipboardFailed}
              popupBlocked={popupBlocked}
              publishText={`${post.title}\n\n${post.content}`}
              writeUrl={NAVER_BLOG_WRITE_URL}
            />
          )}

          {showPublishConfirm && <PhotoCopyCard photoFile={photoFile} />}

          {showPublishConfirm && (
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
          )}

          <ScheduleActions onBack={() => navigate(-1)} onPublishNow={handlePublishNow} />
        </section>
      </main>
    </div>
  );
}

export default SchedulePublish;
