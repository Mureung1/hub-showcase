import { useState } from "react";
import Card from "../Card";

const REASON_MESSAGE = {
  NO_BLOG_ID: "연동된 네이버 블로그가 없어서 자동으로 확인할 수 없어요.",
  NOT_FOUND: "자동으로 찾지 못했어요 (아직 게시 전이거나, 반영에 시간이 걸릴 수 있어요).",
};

function PublishConfirmCard({ onDetect, onConfirm, onCancel, isSubmitting, error }) {
  const [phase, setPhase] = useState("idle"); // idle | checking | found | notFound
  const [foundUrl, setFoundUrl] = useState(null);
  const [notFoundReason, setNotFoundReason] = useState(null);
  const [manualUrl, setManualUrl] = useState("");

  const handleDetect = async () => {
    setPhase("checking");
    try {
      const result = await onDetect();
      if (result.found) {
        setFoundUrl(result.url);
        setPhase("found");
      } else {
        setNotFoundReason(result.reason ?? "NOT_FOUND");
        setPhase("notFound");
      }
    } catch {
      setNotFoundReason("NOT_FOUND");
      setPhase("notFound");
    }
  };

  return (
    <Card className="flex flex-col gap-md border-primary/30">
      <div className="flex items-center gap-sm">
        <span className="material-symbols-outlined text-primary">task_alt</span>
        <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          게시 완료 확인
        </h2>
      </div>

      {phase === "idle" && (
        <>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            네이버 블로그 글쓰기 페이지가 새 탭으로 열렸어요. 내용을 붙여넣고 게시를 마쳤으면 아래 버튼을
            눌러주세요 — 자동으로 게시 여부를 확인해볼게요.
          </p>
          <div className="flex justify-end gap-sm">
            <button
              type="button"
              onClick={onCancel}
              className="px-lg h-11 rounded-lg border border-outline text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-all"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDetect}
              className="px-lg h-11 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 active:scale-[0.98] transition-all"
            >
              게시 확인하기
            </button>
          </div>
        </>
      )}

      {phase === "checking" && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">확인 중...</p>
      )}

      {phase === "found" && (
        <>
          <p className="font-body-sm text-body-sm text-on-surface">이 글을 찾았어요. 맞나요?</p>
          <a
            href={foundUrl}
            target="_blank"
            rel="noreferrer"
            className="font-body-md text-body-md text-primary underline break-all"
          >
            {foundUrl}
          </a>
          {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
          <div className="flex justify-end gap-sm">
            <button
              type="button"
              onClick={() => setPhase("notFound")}
              disabled={isSubmitting}
              className="px-lg h-11 rounded-lg border border-outline text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-all disabled:opacity-40"
            >
              아니요
            </button>
            <button
              type="button"
              onClick={() => onConfirm(foundUrl)}
              disabled={isSubmitting}
              className="px-lg h-11 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {isSubmitting ? "저장 중..." : "맞아요"}
            </button>
          </div>
        </>
      )}

      {phase === "notFound" && (
        <>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {REASON_MESSAGE[notFoundReason] ?? REASON_MESSAGE.NOT_FOUND} 게시된 글 주소를 직접 입력해주세요.
          </p>
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://blog.naver.com/..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-sm focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
          {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
          <div className="flex justify-between gap-sm">
            <button
              type="button"
              onClick={handleDetect}
              disabled={isSubmitting}
              className="font-label-md text-label-md text-primary hover:underline disabled:opacity-40"
            >
              다시 자동으로 확인
            </button>
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-lg h-11 rounded-lg border border-outline text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-all disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => onConfirm(manualUrl)}
                disabled={isSubmitting || !manualUrl.trim()}
                className="px-lg h-11 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "저장 중..." : "게시 완료"}
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export default PublishConfirmCard;
