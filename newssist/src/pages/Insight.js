import { useEffect, useState } from 'react';
import { getClusters } from '../api/insights';
import ClusterCard from '../components/ClusterCard';

export default function Insight() {
  const [clusters, setClusters] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getClusters()
      .then(setClusters)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-container-padding py-stack-lg">
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
    </div>
  );
}
