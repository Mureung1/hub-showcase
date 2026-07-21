import { useRef, useState } from "react";
import Card from "../Card";

function ContentBlock({ block }) {
  if (block.type === "heading") {
    return (
      <h4 className="font-headline-sm text-headline-sm text-primary">{block.text}</h4>
    );
  }
  if (block.type === "note") {
    return (
      <p className="text-on-surface-variant italic whitespace-pre-line">{block.text}</p>
    );
  }
  return (
    <p>
      {block.parts.map((part, i) =>
        part.bold ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>
      )}
    </p>
  );
}

function PostEditor({ title, content, photoLayout = [], onEdit, onRegenerate, onSchedule }) {
  const [titleValue, setTitleValue] = useState(title);
  const contentRef = useRef(null);

  const handleEditClick = () => {
    contentRef.current?.focus();
    onEdit?.();
  };

  return (
    <div className="flex-1 flex flex-col gap-lg overflow-y-auto">
      <Card padding="xl" className="flex flex-col gap-xl">
        <div className="flex flex-col gap-xs">
          <label className="font-label-md text-label-md text-on-surface-variant px-1">제목</label>
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            className="w-full p-md bg-surface-container-low border border-outline-variant rounded-lg font-headline-sm text-headline-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label className="font-label-md text-label-md text-on-surface-variant px-1">홍보글</label>
          <div className="min-h-[500px] p-xl bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className="outline-none space-y-lg text-on-surface"
            >
              {content.map((block, i) => (
                <ContentBlock key={i} block={block} />
              ))}
            </div>
          </div>
        </div>

        {photoLayout.length > 0 && (
          <div className="border-t border-outline-variant pt-xl flex flex-col gap-md">
            <h3 className="font-headline-sm text-headline-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary">photo_library</span>
              사진 배치 추천
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              {photoLayout.map((item) => (
                <div
                  key={item.number}
                  className="p-md bg-surface-container-high rounded-lg flex items-center gap-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {item.number}
                  </div>
                  <span className="font-body-sm text-body-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <footer className="flex items-center justify-end gap-md py-lg mb-container-margin">
        <button
          type="button"
          onClick={handleEditClick}
          className="px-xl h-12 rounded-lg border border-primary text-primary font-label-md text-label-md hover:bg-primary/5 active:bg-primary/10 transition-all flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
          직접 수정
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="px-xl h-12 rounded-lg border border-outline text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high active:bg-surface-container-highest transition-all flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          다시 생성
        </button>
        <button
          type="button"
          onClick={onSchedule}
          className="px-xl h-12 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-xs shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            calendar_today
          </span>
          예약 발행
        </button>
      </footer>
    </div>
  );
}

export default PostEditor;
