import type { AdminAreaBackground } from "../../services/adminAreaBackground";
import type { MarketAnalysis } from "../../services/marketAnalysis";
import type { NearbyEvidence } from "./types";

type PeriodEntry = {
  key: string;
  sourceName: string;
  sourceUrl: string;
  period: string;
  geography: string;
};

function formatPeriod(period: string) {
  const quarter = /^(\d{4})([1-4])$/.exec(period);
  if (quarter) return `${quarter[1]}년 ${quarter[2]}분기`;
  const month = /^(\d{4})(0[1-9]|1[0-2])$/.exec(period);
  if (month) return `${month[1]}년 ${Number(month[2])}월`;
  if (/^\d{4}$/.test(period)) return `${period}년`;
  return period;
}

function uniqueEntries(entries: PeriodEntry[]) {
  return entries.filter(
    (entry, index) =>
      entries.findIndex(
        (candidate) =>
          candidate.sourceName === entry.sourceName &&
          candidate.period === entry.period &&
          candidate.geography === entry.geography,
      ) === index,
  );
}

type DataPeriodSummaryProps = {
  analysis: MarketAnalysis | null;
  background: AdminAreaBackground | null;
  nearbyEvidence: NearbyEvidence[];
};

export function DataPeriodSummary({
  analysis,
  background,
  nearbyEvidence,
}: DataPeriodSummaryProps) {
  const entries = uniqueEntries([
    ...(analysis?.evidence.map((item) => ({
      key: `analysis-${item.source_name}-${item.period}-${item.metric}`,
      sourceName: item.source_name,
      sourceUrl: item.source_url,
      period: item.period,
      geography: "상권",
    })) ?? []),
    ...(background?.evidence.map((item) => ({
      key: `background-${item.source_name}-${item.period}-${item.metric}`,
      sourceName: item.source_name,
      sourceUrl: item.source_url,
      period: item.period,
      geography: item.geography === "market" ? "상권" : "행정동",
    })) ?? []),
    ...nearbyEvidence.map((item) => ({
      key: `nearby-${item.source_snapshot_id}`,
      sourceName: `${item.provider} · ${item.dataset}`,
      sourceUrl: item.source_url,
      period: item.period ?? item.collected_at.slice(0, 10),
      geography: "개별 점포",
    })),
  ]);

  return (
    <section className="data-period-summary" aria-label="데이터 기준 시점">
      <div>
        <span>자료마다 기준 시점이 다를 수 있어요</span>
        <p>
          점포, 매출, 유동인구는 같은 날 수집되지 않을 수 있어요. 숫자를 비교할 때는 오른쪽의
          기간과 범위를 함께 봐주세요.
        </p>
      </div>
      {entries.length > 0 ? (
        <ul>
          {entries.map((entry) => (
            <li key={entry.key}>
              <a href={entry.sourceUrl}>{entry.sourceName}</a>
              <b>{formatPeriod(entry.period)}</b>
              <small>{entry.geography}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status">현재 응답에서 확인 가능한 기간 근거가 없습니다.</p>
      )}
      <small>
        현재 화면은 선택한 분기의 자료를 보여줍니다. 분기를 바꾸면 그 시점에 맞는 자료로 함께
        바뀝니다.
      </small>
    </section>
  );
}
