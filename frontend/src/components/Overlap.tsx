import { useEffect, useState } from 'react';
import { ChipIcon } from '../chipIcons';
import { checkOverlap } from '../api/overlap';
import type { OverlapResult } from '../api/overlap';
import { ApiError } from '../api/ApiError';

interface OverlapProps {
  supplements: string[];
  token: string;
  onNext: () => void;
  onAuthError: () => void;
}

export function Overlap({ supplements, token, onNext, onAuthError }: OverlapProps) {
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
    checkOverlap(supplements, token)
      .then(setResults)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          onAuthError();
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [supplements, token, onAuthError]);

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
      {!loading && !error && supplements.length > 0 && results.length === 0 && (
        <p className="sub">입력하신 영양제에서 확인된 성분이 없어요. 중복되는 성분이 없어요.</p>
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
          <div>
            <p className="chip-label" style={{ margin: 0 }}>
              {result.ingredientName}
            </p>
            <p className="sub" style={{ margin: '2px 0 0' }}>
              {result.message}
            </p>
          </div>
        </div>
      ))}

      <button className="btn" type="button" onClick={onNext}>
        다음
      </button>
    </>
  );
}
