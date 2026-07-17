import { Copy, Check, RefreshCw, Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { PLATFORMS, HASHTAG_SUGGESTIONS } from "../data/mockData";

export function ResultContent({
  result,
  platform,
  copied,
  onCopy,
  onRegenerate,
  imageGenerated,
  imageCaption,
  isGeneratingImage,
  onGenerateImage,
  onResetImage,
}) {
  return (
    <>
      {/* 플랫폼 미리보기 카드 */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "var(--primary)" }}
          >
            사
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-none mb-0.5">우리동네 맛집</p>
            <p className="text-xs text-muted-foreground">방금 전</p>
          </div>
          <div className="text-lg">{PLATFORMS.find((p) => p.id === platform)?.icon}</div>
        </div>

        <div className="px-4 py-4">
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{result}</pre>
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
          <span>❤️ 247</span>
          <span>💬 38</span>
          <span>🔗 12</span>
          <span className="ml-auto">{result.length}자</span>
        </div>
      </div>

      {/* 복사/재생성/저장 — 자동 SNS 업로드가 아니라 사용자가 직접 게시하는 흐름 */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onCopy}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-xs hover:bg-card transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} style={{ color: "#34D399" }} />
              <span style={{ color: "#34D399" }}>복사됨!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              복사하기
            </>
          )}
        </button>
        <button
          onClick={onRegenerate}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-xs hover:bg-card transition-colors"
        >
          <RefreshCw size={12} />
          다시 생성
        </button>
        <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-xs hover:bg-card transition-colors">
          <Download size={12} />
          저장하기
        </button>
      </div>

      {/* AI 이미지 생성 (GPT Image 1.5) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">AI 이미지 생성</div>
          <span className="text-xs text-muted-foreground">GPT Image 1.5</span>
        </div>

        {!imageGenerated && !isGeneratingImage && (
          <button
            onClick={onGenerateImage}
            className="flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-border hover:border-[rgba(255,176,32,0.4)] hover:bg-[rgba(255,176,32,0.04)] transition-all text-sm text-muted-foreground group"
          >
            <ImageIcon size={16} className="group-hover:text-[#FFB020] transition-colors" />
            <span className="group-hover:text-foreground transition-colors">
              이 하소연을 이미지로 시각화하기
            </span>
          </button>
        )}

        {isGeneratingImage && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-border">
            <Loader2 size={20} className="animate-spin" style={{ color: "#FFB020" }} />
            <p className="text-xs text-muted-foreground">이미지를 생성하는 중...</p>
          </div>
        )}

        {imageGenerated && (
          <div className="relative rounded-xl overflow-hidden border border-border bg-card aspect-square max-h-64">
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,77,31,0.15) 0%, rgba(255,176,32,0.08) 50%, rgba(79,195,247,0.12) 100%)",
              }}
            >
              <div className="text-5xl">☔</div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
                {imageCaption}
              </p>
            </div>
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button className="p-1.5 rounded-lg bg-background/70 backdrop-blur-sm border border-border hover:bg-background transition-colors">
                <Download size={12} />
              </button>
              <button
                onClick={onResetImage}
                className="p-1.5 rounded-lg bg-background/70 backdrop-blur-sm border border-border hover:bg-background transition-colors"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 추천 해시태그 */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">추천 해시태그</div>
        <div className="flex flex-wrap gap-1.5">
          {HASHTAG_SUGGESTIONS.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[rgba(255,255,255,0.14)] cursor-pointer transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
