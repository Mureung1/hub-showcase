import Card from "../Card";

function AISummaryCard() {
  return (
    <Card className="flex flex-col gap-md">
      <div className="flex items-center gap-sm">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            smart_toy
          </span>
        </div>
        <span className="font-headline-sm text-headline-sm text-primary">🤖 알리장 AI</span>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        브랜드 정보와 인터뷰 내용을 반영하여 홍보글을 작성했습니다.
      </p>
    </Card>
  );
}

export default AISummaryCard;
