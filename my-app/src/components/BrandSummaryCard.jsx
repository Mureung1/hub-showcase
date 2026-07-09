import Card from "./Card";

function BrandSummaryCard({ summary, keywords, onViewProfile }) {
  return (
    <Card>
      <div className="flex items-center gap-xs mb-md">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          smart_toy
        </span>
        <h2 className="font-headline-sm text-headline-sm">AI가 이해한 우리 브랜드</h2>
      </div>

      <div className="bg-surface-container-low p-md rounded-lg mb-md">
        <p className="text-body-md text-on-surface italic">"{summary}"</p>
      </div>

      <div className="flex flex-wrap gap-xs mb-lg">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="px-md py-xs bg-secondary-container text-on-secondary-container rounded-full text-label-md"
          >
            #{keyword}
          </span>
        ))}
      </div>

      <a
        href="#"
        onClick={onViewProfile}
        className="inline-flex items-center text-primary font-semibold hover:underline"
      >
        브랜드 프로필 보기
        <span className="material-symbols-outlined text-sm ml-xs">arrow_forward</span>
      </a>
    </Card>
  );
}

export default BrandSummaryCard;
