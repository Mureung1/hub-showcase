import Card from "../Card";

function PreviewCard({ target }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-md bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
        <div className="flex items-center gap-sm">
          <div className="w-2 h-2 rounded-full bg-error" />
          <div className="w-2 h-2 rounded-full bg-secondary-container" />
          <div className="w-2 h-2 rounded-full bg-secondary-fixed-dim" />
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          미리보기 ({target})
        </span>
      </div>
      <div className="p-xl flex gap-lg">
        <div className="w-40 h-28 bg-surface-container-high rounded-lg shrink-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-outline-variant !text-[40px]">image</span>
        </div>
        <div className="flex-1 flex flex-col gap-sm">
          <div className="h-6 bg-surface-container-high rounded w-3/4" />
          <div className="h-4 bg-surface-container-high rounded w-full" />
          <div className="h-4 bg-surface-container-high rounded w-full" />
          <div className="h-4 bg-surface-container-high rounded w-1/2" />
        </div>
      </div>
    </Card>
  );
}

export default PreviewCard;
