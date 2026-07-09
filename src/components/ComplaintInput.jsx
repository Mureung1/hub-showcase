import { X, PenLine } from "lucide-react";

export function ComplaintInput({ value, charCount, textareaRef, onChange, onClear }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          오늘의 하소연
        </label>
        <span className="text-xs font-mono text-muted-foreground">{charCount} / 500</span>
      </div>

      <div className="relative bg-card border border-border rounded-xl overflow-hidden focus-within:border-[rgba(255,77,31,0.45)] transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          placeholder={
            "오늘 있었던 일을 그냥 편하게 적어주세요.\n\n예) 손님이 주문하고 30분 후 환불 요청을 했어요. 이미 다 만들었는데 진짜..."
          }
          maxLength={500}
          className="w-full bg-transparent px-4 pt-4 pb-3 text-sm leading-relaxed resize-none outline-none placeholder:text-muted-foreground/50 min-h-[120px]"
          style={{ scrollbarWidth: "none" }}
        />
        {value && (
          <button
            onClick={onClear}
            className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={13} />
          </button>
        )}
        <div className="px-4 pb-3 flex items-center gap-2">
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <PenLine size={11} /> 예시 불러오기
          </button>
        </div>
      </div>
    </div>
  );
}
