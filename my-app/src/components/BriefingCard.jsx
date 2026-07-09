import { useState } from "react";
import Card from "./Card";

const REASON_STYLES = [
  { icon: "error", color: "text-error" },
  { icon: "trending_up", color: "text-secondary" },
  { icon: "monitoring", color: "text-tertiary" },
];

const EFFECT_STYLES = {
  secondary: { bg: "bg-secondary-container/20", text: "text-secondary" },
  tertiary: { bg: "bg-tertiary-container/10", text: "text-tertiary" },
};

function BriefingCard({ reason, recommendedTopic, expectedEffect, onStart }) {
  const [showReason, setShowReason] = useState(false);

  return (
    <Card padding="xl" className="border-l-4 border-primary">
      <div className="flex justify-between items-start mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
            오늘의 AI 브리핑
          </h2>
          <p className="text-body-lg text-on-surface-variant">오늘 추천드리는 홍보</p>
        </div>
        <span className="px-md py-xs bg-primary-fixed text-primary rounded-full font-bold text-label-md">
          AI Insights
        </span>
      </div>

      <ul className="space-y-md mb-xl">
        {reason.map((r, i) => {
          const style = REASON_STYLES[i % REASON_STYLES.length];
          return (
            <li key={r} className="flex items-start gap-md">
              <span className={`material-symbols-outlined mt-1 ${style.color}`}>
                {style.icon}
              </span>
              <span className="text-body-md">{r}</span>
            </li>
          );
        })}
      </ul>

      <div className="bg-surface-container-low p-lg rounded-xl mb-lg">
        <h3 className="font-label-md text-label-md text-primary uppercase tracking-wider mb-xs">
          추천 행동
        </h3>
        <p className="text-headline-sm text-on-surface">{recommendedTopic}</p>
      </div>

      <div className="flex flex-wrap items-center gap-md mb-lg">
        <button
          onClick={onStart}
          className="px-xl py-md bg-primary text-on-primary font-bold rounded-lg shadow-md hover:bg-primary-container transition-all active:scale-95"
        >
          추천으로 시작하기
        </button>
        <button
          onClick={() => setShowReason((v) => !v)}
          className="px-xl py-md text-primary font-semibold hover:bg-primary-fixed/30 rounded-lg transition-colors flex items-center gap-xs"
        >
          추천 근거 보기
          <span className="material-symbols-outlined">
            {showReason ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>

      {showReason && (
        <div className="border-t border-outline-variant pt-lg mt-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {expectedEffect.map((effect) => {
              const style = EFFECT_STYLES[effect.color];
              return (
                <div
                  key={effect.title}
                  className={`flex items-center gap-md p-md rounded-lg ${style.bg}`}
                >
                  <span
                    className={`material-symbols-outlined ${style.text}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {effect.icon}
                  </span>
                  <div>
                    <p className={`text-label-md font-bold ${style.text}`}>{effect.title}</p>
                    <p className="text-body-sm text-on-surface-variant">{effect.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default BriefingCard;
