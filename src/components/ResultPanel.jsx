import { MoreHorizontal } from "lucide-react";
import { getTempColor, getTempLabel, TempIcon } from "../utils/temperature";
import { ResultEmptyState } from "./ResultEmptyState";
import { ResultLoading } from "./ResultLoading";
import { ResultContent } from "./ResultContent";

export function ResultPanel({
  result,
  isGenerating,
  resultTemp,
  platform,
  copied,
  imageGenerated,
  isGeneratingImage,
  onPickExample,
  onCopy,
  onRegenerate,
  onGenerateImage,
  onResetImage,
}) {
  const resultColor = getTempColor(resultTemp);

  return (
    <div className="w-[52%] shrink-0 flex flex-col overflow-hidden bg-background">
      <div className="h-11 shrink-0 border-b border-border flex items-center justify-between px-5">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">생성된 콘텐츠</span>
        {result && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-mono"
              style={{ background: `${resultColor}15`, color: resultColor, border: `1px solid ${resultColor}30` }}
            >
              <TempIcon t={resultTemp} size={9} />
              {resultTemp}° · {getTempLabel(resultTemp)}
            </div>
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <MoreHorizontal size={14} className="text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {!result && !isGenerating && <ResultEmptyState onPickExample={onPickExample} />}
        {isGenerating && <ResultLoading color={resultColor} />}
        {result && !isGenerating && (
          <ResultContent
            result={result}
            platform={platform}
            copied={copied}
            onCopy={onCopy}
            onRegenerate={onRegenerate}
            imageGenerated={imageGenerated}
            isGeneratingImage={isGeneratingImage}
            onGenerateImage={onGenerateImage}
            onResetImage={onResetImage}
          />
        )}
      </div>
    </div>
  );
}
