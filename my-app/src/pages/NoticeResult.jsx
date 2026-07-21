import { useNavigate, useParams } from "react-router-dom";
import PageTopBar from "../components/PageTopBar";
import NoticeEditor from "../components/notice-result/NoticeEditor";
import { useNoticeResult } from "../hooks/useNoticeResult";

function NoticeResult() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: result, error } = useNoticeResult(id);

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
          onPublish={() => navigate("/")}
        />
      </main>
    </div>
  );
}

export default NoticeResult;
