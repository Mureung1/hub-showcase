import { useState } from "react";
import Card from "../Card";

function AIExplanationCard({ reasons, expectedEffect }) {
  const [open, setOpen] = useState(true);

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-lg flex items-center justify-between hover:bg-surface-container-low transition-colors"
      >
        <h3 className="font-headline-sm text-headline-sm">AI 추천 이유</h3>
        <span
          className="material-symbols-outlined transition-transform duration-300"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-180deg)" }}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="px-lg pb-lg flex flex-col gap-lg">
          <div className="space-y-sm">
            {reasons.map((reason) => (
              <div key={reason} className="flex items-center gap-xs">
                <span className="w-1 h-1 rounded-full bg-primary" />
                <span className="font-body-sm text-body-sm text-on-surface-variant">{reason}</span>
              </div>
            ))}
          </div>

          <div className="p-md bg-secondary-container/10 rounded-lg space-y-xs">
            <span className="font-label-md text-label-md text-secondary block mb-xs">기대 효과</span>
            {expectedEffect.map((effect) => (
              <div key={effect} className="flex items-center gap-xs text-secondary">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span className="font-body-sm text-body-sm">{effect}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default AIExplanationCard;
