import Card from "./Card";

const RING_COLOR = {
  good: "text-secondary-fixed-dim",
  normal: "text-outline",
  warning: "text-error",
};

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function BlogHealthCard({ score, level, daysSinceLastPost, visitorCount, onDetail }) {
  const ringColor = RING_COLOR[level] ?? RING_COLOR.normal;
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <Card>
      <h2 className="font-headline-sm text-headline-sm mb-lg">블로그 건강도</h2>
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-md">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="transparent"
              strokeWidth="8"
              className="text-surface-variant"
              stroke="currentColor"
            />
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="transparent"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className={ringColor}
              stroke="currentColor"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-display-lg font-display-lg text-primary leading-none">
              {score}
            </span>
            <span className="text-label-sm text-on-surface-variant">점</span>
          </div>
        </div>

        <div className="w-full space-y-xs mb-lg">
          <div className="flex justify-between items-center py-xs border-b border-surface-variant">
            <span className="text-body-sm text-on-surface-variant">최근 게시물</span>
            <span className="text-body-sm font-semibold">
              {daysSinceLastPost === null ? "정보 없음" : `${daysSinceLastPost}일 전`}
            </span>
          </div>
          <div className="flex justify-between items-center py-xs border-b border-surface-variant">
            <span className="text-body-sm text-on-surface-variant">최근 방문자 수</span>
            <span className="text-body-sm font-semibold">
              {visitorCount.toLocaleString()}명
            </span>
          </div>
        </div>

        <button
          onClick={onDetail}
          className="w-full py-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold rounded-lg transition-colors"
        >
          자세히 보기
        </button>
      </div>
    </Card>
  );
}

export default BlogHealthCard;
