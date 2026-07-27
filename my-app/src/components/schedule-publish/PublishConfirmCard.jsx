import { useState } from "react";
import Card from "../Card";

function PublishConfirmCard({ onConfirm, onCancel, isSubmitting, error }) {
  const [url, setUrl] = useState("");

  return (
    <Card className="flex flex-col gap-md border-primary/30">
      <div className="flex items-center gap-sm">
        <span className="material-symbols-outlined text-primary">task_alt</span>
        <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          게시 완료 확인
        </h2>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        네이버 블로그 글쓰기 페이지가 새 탭으로 열렸어요. 내용을 붙여넣고 게시한 뒤, 게시된 글 주소를 아래에
        입력하고 완료를 눌러주세요.
      </p>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://blog.naver.com/..."
        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-sm focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
      />
      {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
      <div className="flex justify-end gap-sm">
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
          onClick={() => onConfirm(url)}
          disabled={isSubmitting || !url.trim()}
          className="px-lg h-11 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "저장 중..." : "게시 완료"}
        </button>
      </div>
    </Card>
  );
}

export default PublishConfirmCard;
