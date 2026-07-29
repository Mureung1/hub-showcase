import Card from "../Card";

function PreviewCard({ target, title, content, imageUrl }) {
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
        <div className="w-40 h-28 bg-surface-container-high rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-outline-variant !text-[40px]">image</span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-xs">
          <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">{title}</h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 whitespace-pre-line">
            {content}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default PreviewCard;
