import { Sparkles } from "lucide-react";
import { QUICK_EXAMPLES } from "../data/mockData";

export function ResultEmptyState({ onPickExample }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
        <Sparkles size={24} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium mb-1">아직 생성된 콘텐츠가 없어요</p>
        <p className="text-xs text-muted-foreground">왼쪽에 하소연을 입력하고 생성 버튼을 누르세요</p>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-xs w-full mt-2">
        {QUICK_EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => onPickExample(q)}
            className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[rgba(255,255,255,0.14)] transition-all text-left"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
