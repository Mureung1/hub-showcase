import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKeywords } from '../api/keywords';
import { createProfile } from '../api/profile';

export default function Onboarding() {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getKeywords()
      .then(setKeywords)
      .catch(() => setError('키워드 목록을 불러오지 못했어요'))
      .finally(() => setLoading(false));
  }, []);

  function toggleKeyword(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createProfile({ keywordIds: selectedIds });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg border border-outline-variant rounded p-stack-lg bg-surface-container-lowest"
      >
        <h1 className="font-headline-md text-headline-md text-on-surface mb-stack-md">관심 키워드를 선택해주세요</h1>

        {error && (
          <p className="font-body-md text-body-md text-error mb-stack-sm">{error}</p>
        )}

        {loading ? (
          <p className="font-body-md text-body-md text-on-surface-variant">불러오는 중...</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-stack-lg">
            {keywords.map((k) => {
              const selected = selectedIds.includes(k.id);
              return (
                <button
                  type="button"
                  key={k.id}
                  onClick={() => toggleKeyword(k.id)}
                  className={`px-3 py-1.5 rounded-full border-2 font-label-mono text-label-mono uppercase tracking-wide ${
                    selected
                      ? 'bg-btn-gray text-on-surface border-btn-gray'
                      : 'bg-transparent text-on-surface-variant border-outline-variant'
                  }`}
                >
                  {k.name}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || loading}
          className="w-full bg-primary text-on-primary rounded-lg py-2 font-body-md disabled:opacity-50"
        >
          시작하기
        </button>
      </form>
    </div>
  );
}
