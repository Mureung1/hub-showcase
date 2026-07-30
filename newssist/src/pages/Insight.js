import { useEffect, useState } from 'react';
import { getClusters } from '../api/insights';
import { getWeeklyReport, generateWeeklyReport } from '../api/reports';
import ClusterCard from '../components/ClusterCard';

export default function Insight() {
  const [clusters, setClusters] = useState(null);
  const [error, setError] = useState(null);

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);

  useEffect(() => {
    getClusters()
      .then(setClusters)
      .catch((err) => setError(err.message));

    getWeeklyReport()
      .then(setReport)
      .catch((err) => setReportError(err.message))
      .finally(() => setReportLoading(false));
  }, []);

  async function handleGenerateReport() {
    setGenerating(true);
    setReportError(null);
    try {
      const newReport = await generateWeeklyReport();
      setReport(newReport);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="px-container-padding py-stack-lg">
      <div className="mb-stack-lg">
        <h1 className="font-display-lg text-on-surface" style={{ fontSize: '36px', lineHeight: '44px', fontWeight: 700 }}>
          인사이트
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          내가 읽은 기사를 바탕으로 한 나만의 시사 흐름 분석
        </p>
      </div>

      <div className="flex items-center gap-2 mb-stack-md">
        <span className="material-symbols-outlined text-primary">auto_awesome</span>
        <h2 className="font-headline-md text-headline-md text-on-surface">AI 시장 흐름 설명</h2>
      </div>

      {error && <p className="font-body-md text-body-md text-error">{error}</p>}

      {!error && !clusters && (
        <p className="font-body-md text-body-md text-on-surface-variant">불러오는 중...</p>
      )}

      {clusters && clusters.length === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">
          아직 인사이트가 없어요. 기사를 몇 개 더 읽으면 다음 배치 때 시사 흐름을 보여드릴게요.
        </p>
      )}

      {clusters && clusters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          {clusters.map((cluster, i) => (
            <ClusterCard key={cluster.id} cluster={cluster} colorIndex={i} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-stack-lg mb-stack-md">
        <span className="material-symbols-outlined text-primary">calendar_view_week</span>
        <h2 className="font-headline-md text-headline-md text-on-surface">주간 리포트</h2>
      </div>

      {reportLoading && (
        <p className="font-body-md text-body-md text-on-surface-variant">불러오는 중...</p>
      )}

      {!reportLoading && report && (
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-stack-md">
          <p className="font-label-mono text-label-mono uppercase text-on-surface-variant mb-stack-sm">
            {report.weekStartDate} 주
          </p>
          <p className="font-body-md text-body-md text-on-surface leading-relaxed mb-stack-md">
            {report.content}
          </p>
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={generating}
            className="font-label-mono text-label-mono uppercase text-primary disabled:opacity-50"
          >
            {generating ? '다시 생성하는 중...' : '다시 생성하기'}
          </button>
        </div>
      )}

      {!reportLoading && !report && (
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-stack-md">
          <p className="font-body-md text-body-md text-on-surface-variant mb-stack-md">
            이번 주 리포트가 아직 없어요.
          </p>
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={generating}
            className="font-label-mono text-label-mono uppercase text-primary disabled:opacity-50"
          >
            {generating ? '생성하는 중...' : '생성하기'}
          </button>
        </div>
      )}

      {reportError && reportError === 'not_found' && (
        <p className="font-body-md text-body-md text-on-surface-variant mt-stack-sm">
          이번 주엔 아직 리포트를 만들 만큼 인사이트가 쌓이지 않았어요.
        </p>
      )}
      {reportError && reportError !== 'not_found' && (
        <p className="font-body-md text-body-md text-error mt-stack-sm">{reportError}</p>
      )}
    </div>
  );
}
