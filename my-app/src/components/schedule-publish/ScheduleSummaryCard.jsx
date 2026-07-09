import Card from "../Card";

function ScheduleSummaryCard({ publishDate, publishTime, target }) {
  return (
    <Card className="flex flex-col gap-md">
      <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
        예약 정보
      </h2>
      <div className="flex flex-col gap-sm">
        <div className="flex justify-between items-center">
          <span className="font-body-sm text-body-sm text-on-surface-variant">게시일</span>
          <span className="font-body-sm text-body-sm font-bold">{publishDate}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-body-sm text-body-sm text-on-surface-variant">발행 시간</span>
          <span className="font-body-sm text-body-sm font-bold">{publishTime}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-body-sm text-body-sm text-on-surface-variant">대상</span>
          <div className="flex items-center gap-xs">
            <div className="w-5 h-5 bg-secondary rounded flex items-center justify-center">
              <span className="text-[10px] text-on-secondary font-bold">N</span>
            </div>
            <span className="font-body-sm text-body-sm font-bold">{target}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ScheduleSummaryCard;
