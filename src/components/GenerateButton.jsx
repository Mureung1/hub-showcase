import { Sparkles, Loader2 } from "lucide-react";

export function GenerateButton({ isGenerating, disabled, onClick }) {
  return (
    <div className="shrink-0 p-4 border-t border-border bg-card/40">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
          isGenerating ? "text-foreground" : "text-white"
        }`}
        style={{ background: isGenerating ? "var(--muted)" : "var(--primary)" }}
      >
        {isGenerating ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            콘텐츠 생성 중...
          </>
        ) : (
          <>
            <Sparkles size={15} />
            콘텐츠 생성하기
          </>
        )}
      </button>
    </div>
  );
}