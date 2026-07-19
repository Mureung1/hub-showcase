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
        <span>데이터 기준 시점</span>
        <p>
          지표마다 공식 원천의 갱신 주기가 달라 같은 날짜로 강제하지 않습니다. 각 값의 기간과 공간
          단위를 함께 확인해 주세요.
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
        현재 화면은 제공 가능한 최신 snapshot을 조합하며, 사용자가 기간을 바꾸는 기능은 아직
        지원하지 않습니다.
      </small>
    </section>
  );
}
