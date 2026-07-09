import Card from "../Card";

function ThumbnailCard({ thumbnail }) {
  return (
    <Card className="flex flex-col gap-md">
      <h3 className="font-headline-sm text-headline-sm">추천 썸네일</h3>
      <div className="aspect-square w-full rounded-lg overflow-hidden border border-outline-variant relative bg-surface-variant flex items-center justify-center">
        {thumbnail.url ? (
          <img src={thumbnail.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-outline text-[40px]">image</span>
        )}
        <div className="absolute top-2 left-2 bg-primary text-on-primary px-sm py-1 rounded-md text-label-sm font-label-sm">
          BEST
        </div>
      </div>
      <div className="flex items-start gap-xs p-sm bg-primary-container/10 rounded-lg">
        <span className="material-symbols-outlined text-primary text-[18px]">info</span>
        <p className="font-body-sm text-body-sm text-on-primary-fixed-variant">{thumbnail.note}</p>
      </div>
    </Card>
  );
}

export default ThumbnailCard;
