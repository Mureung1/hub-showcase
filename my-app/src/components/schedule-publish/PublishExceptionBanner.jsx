import { useState } from "react";
import Card from "../Card";

function PublishExceptionBanner({ clipboardFailed, popupBlocked, publishText, writeUrl }) {
  const [copyDone, setCopyDone] = useState(false);

  if (!clipboardFailed && !popupBlocked) return null;

  const handleRetryCopy = async () => {
    try {
      await navigator.clipboard.writeText(publishText);
      setCopyDone(true);
    } catch {
      setCopyDone(false);
    }
  };

  return (
    <Card className="flex flex-col gap-md border-error/40">
      <div className="flex items-center gap-sm">
        <span className="material-symbols-outlined text-error">error</span>
        <h2 className="font-label-md text-label-md text-error uppercase tracking-wider">확인이 필요해요</h2>
      </div>

      {popupBlocked && (
        <div className="flex items-center justify-between gap-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            브라우저가 팝업(새 탭)을 차단한 것 같아요. 아래 링크로 직접 열어주세요.
          </p>
          <a
            href={writeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-lg h-11 flex items-center rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-all whitespace-nowrap"
          >
            새 탭으로 열기
          </a>
        </div>
      )}

      {clipboardFailed && (
        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between gap-md">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              클립보드 복사에 실패했어요. 아래 내용을 직접 선택해서 복사해주세요.
            </p>
            <button
              type="button"
              onClick={handleRetryCopy}
              className="px-lg h-11 rounded-lg border border-outline text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-all whitespace-nowrap"
            >
              {copyDone ? "복사됨" : "다시 복사"}
            </button>
          </div>
          <textarea
            readOnly
            value={publishText}
            onFocus={(e) => e.target.select()}
            rows={4}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-sm resize-none"
          />
        </div>
      )}
    </Card>
  );
}

export default PublishExceptionBanner;
