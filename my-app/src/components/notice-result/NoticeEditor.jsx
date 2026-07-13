import { useRef, useState } from "react";
import Card from "../Card";

function NoticeEditor({ title, content, confidence, keywords, tone, onPublish }) {
  const [titleValue, setTitleValue] = useState(title);
  const [contentValue, setContentValue] = useState(content);
  const contentRef = useRef(null);

  const handleEditClick = () => {
    contentRef.current?.focus();
  };

  return (
    <div className="max-w-[750px] w-full flex flex-col gap-lg">
      <Card padding="none" className="overflow-hidden">
        <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-sm">
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <span className="font-headline-sm text-headline-sm">🤖 AI가 작성한 공지</span>
          </div>
          <span className="bg-secondary-container text-on-secondary-container px-sm py-1 rounded-full font-label-sm text-label-sm">
            {confidence}
          </span>
        </div>

        <div className="p-lg flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1">
              공지 제목
            </label>
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              className="w-full px-md py-sm rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all font-headline-sm text-headline-sm text-on-surface"
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1">
              공지 내용
            </label>
            <textarea
              ref={contentRef}
              value={contentValue}
              onChange={(e) => setContentValue(e.target.value)}
              rows={10}
              className="w-full px-md py-sm rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all font-body-md text-body-md text-on-surface leading-relaxed resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-xs pt-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              추천 키워드:
            </span>
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="bg-surface-container text-on-surface-variant px-sm py-1 rounded-full font-label-sm text-label-sm"
              >
                #{keyword}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={handleEditClick}
          className="flex-1 flex items-center justify-center gap-sm bg-surface-container-lowest border border-outline text-on-surface py-md rounded-xl font-headline-sm text-headline-sm hover:bg-surface-container-low transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">edit_note</span>
          직접 수정
        </button>
        <button
          type="button"
          onClick={() => {}}
          className="flex-1 flex items-center justify-center gap-sm bg-surface-container-lowest border border-outline-variant text-on-surface-variant py-md rounded-xl font-headline-sm text-headline-sm hover:bg-surface-container-low transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">refresh</span>
          다시 생성
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="flex-[1.5] flex items-center justify-center gap-sm bg-primary text-on-primary py-md rounded-xl font-headline-sm text-headline-sm shadow-md hover:opacity-90 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">send</span>
          게시하기
        </button>
      </div>

      <div className="px-md py-sm bg-secondary-container/10 border border-secondary/20 rounded-lg flex items-start gap-md">
        <span className="material-symbols-outlined text-secondary mt-1">lightbulb</span>
        <p className="font-body-sm text-body-sm text-on-secondary-fixed-variant">
          <strong>AI Tip:</strong> 현재 톤은 '{tone}'입니다. 더 간결한 안내를 원하시면 '다시 생성' 버튼을 눌러보세요.
        </p>
      </div>
    </div>
  );
}

export default NoticeEditor;
