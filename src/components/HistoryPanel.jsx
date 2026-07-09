import { X, Plus } from "lucide-react";
import { getTempColor, TempIcon } from "../utils/temperature";

export function HistoryPanel({ items, onSelect, onClose }) {
  return (
    <aside className="w-72 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          생성 히스토리
        </span>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {items.map((item) => {
          const color = getTempColor(item.temp);
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="text-left p-3 rounded-xl border border-border hover:border-[rgba(255,255,255,0.14)] hover:bg-background transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono"
                  style={{ background: `${color}15`, color }}
                >
                  <TempIcon t={item.temp} size={9} />
                  {item.temp}°
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {item.preview}
              </p>
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-border">
        <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border border-border hover:bg-muted transition-colors text-muted-foreground">
          <Plus size={11} /> 새로 만들기
        </button>
      </div>
    </aside>
  );
}
