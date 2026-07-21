import Card from "../Card";

function HeroTimeCard({ day, time, confidence, reasons }) {
  return (
    <Card className="relative overflow-hidden">
      <span className="material-symbols-outlined absolute top-0 right-0 p-lg !text-[80px] text-primary/10">
        psychology
      </span>

      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary">smart_toy</span>
          <h2 className="font-headline-sm text-headline-sm">AI 추천 발행 시간</h2>
        </div>
        {confidence != null && (
          <span className="flex items-center gap-xs px-sm py-xs rounded-full bg-secondary-container/30 text-on-secondary-container font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim" />
            추천도 {confidence}%
          </span>
        )}
      </div>

      <div className="py-md">
        <p className="font-display-lg text-display-lg text-primary tracking-tight">
          {day} {time}
        </p>
        <p className="text-on-surface-variant font-body-sm text-body-sm mt-xs">
          최적의 시점에 게시하여 효과를 극대화하세요.
        </p>
      </div>

      <div className="mt-lg pt-lg border-t border-outline-variant">
        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">
          추천 이유
        </h3>
        <ul className="flex flex-col gap-sm">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-xs">
              <span className="material-symbols-outlined text-secondary-fixed-dim text-[18px]">
                check_circle
              </span>
              <span className="font-body-sm text-body-sm">{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export default HeroTimeCard;
