import { useEffect, useState } from 'react';
import { ChipIcon } from '../chipIcons';
import { checkOverlap } from '../api/overlap';
import type { OverlapResult } from '../api/overlap';

interface OverlapProps {
  supplements: string[];
  onNext: () => void;
}

export function Overlap({ supplements, onNext }: OverlapProps) {
  const [results, setResults] = useState<OverlapResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplements.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    checkOverlap(supplements)
      .then(setResults)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [supplements]);

  const exceededResults = results.filter((r) => r.isExceeded);
  const okResults = results.filter((r) => !r.isExceeded);

  return (
    <>
      <h1 className="heading" style={{ fontSize: 22 }}>
        성분 중복을
        <br />
        확인했어요
      </h1>
      <p className="sub" style={{ marginTop: -8 }}>
        입력하신 영양제의 성분과 함량을 확인했어요.
      </p>

      {loading && <p className="sub">확인 중이에요...</p>}
      {error && <p className="sub" style={{ color: 'var(--color-accent-pink)' }}>{error}</p>}
      {!loading && !error && supplements.length === 0 && (
        <p className="sub">입력하신 영양제가 없어서 중복 체크를 건너뛸게요.</p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="card stat-row">
          <div>
            <p className="stat-label">확인한 성분</p>
            <p className="stat-value">{results.length}개</p>
          </div>
          <div>
            <p className="stat-label">상한 초과</p>
            <p
              className="stat-value"
              style={{ color: exceededResults.length > 0 ? 'var(--color-accent-pink)' : 'var(--color-accent-green)' }}
            >
              {exceededResults.length > 0 ? `${exceededResults.length}개` : '없음'}
            </p>
          </div>
        </div>
      )}

      {[...exceededResults, ...okResults].map((result) => (
        <div
          className="card"
          key={result.ingredientId}
          style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
        >
          <span
            className="chip-icon"
            style={{
              background: result.isExceeded ? 'var(--tint-pink)' : 'var(--tint-green)',
              color: result.isExceeded ? 'var(--color-accent-pink)' : 'var(--color-accent-green)',
              flexShrink: 0,
            }}
          >
            <ChipIcon name={result.isExceeded ? 'warning' : 'check'} />
          </span>
          <p className="sub" style={{ margin: 0 }}>
            {result.message}
          </p>
        </div>
      ))}

      <button className="btn" type="button" onClick={onNext}>
        다음
      </button>
    </>
  );
}
