import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { SYMPTOM_ID_BY_NAME, INGREDIENT_ICONS } from '../mockData';
import { getRecommendedIngredients } from '../api/ingredients';
import type { RecommendedIngredient } from '../api/ingredients';
import { ChipIcon, getChipColor } from '../chipIcons';

interface AnalysisProps {
  symptoms: string[];
  onNext: (ingredientIds: number[]) => void;
}

export function Analysis({ symptoms, onNext }: AnalysisProps) {
  const [supplementInput, setSupplementInput] = useState('');
  const [supplements, setSupplements] = useState<string[]>([]);
  const [recommendedIngredients, setRecommendedIngredients] = useState<RecommendedIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const symptomIds = symptoms.map((name) => SYMPTOM_ID_BY_NAME[name]).filter(Boolean);
    if (symptomIds.length === 0) {
      setRecommendedIngredients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getRecommendedIngredients(symptomIds)
      .then(setRecommendedIngredients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [symptoms]);

  function addSupplement(e: FormEvent) {
    e.preventDefault();
    const trimmed = supplementInput.trim();
    if (!trimmed) return;
    setSupplements((prev) => [...prev, trimmed]);
    setSupplementInput('');
  }

  function removeSupplement(index: number) {
    setSupplements((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <>
      <h1 className="heading" style={{ fontSize: 22 }}>
        이 성분이
        <br />
        필요해요
      </h1>
      <p className="sub" style={{ marginTop: -8 }}>
        선택하신 증상을 분석한 결과예요. 1일 권장 섭취량 기준으로 추천했어요.
      </p>

      {loading && <p className="sub">분석 중이에요...</p>}
      {error && <p className="sub" style={{ color: 'var(--color-accent-pink)' }}>{error}</p>}

      <div className="chip-list">
        {recommendedIngredients.map((ingredient, index) => {
          const color = getChipColor(index);
          return (
            <span className="chip-badge" key={ingredient.id}>
              <span className="chip-icon" style={{ background: color.tint, color: color.accent }}>
                <ChipIcon name={INGREDIENT_ICONS[ingredient.name] ?? 'droplet'} />
              </span>
              <span className="chip-label">{ingredient.name}</span>
            </span>
          );
        })}
      </div>

      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span
          className="chip-icon"
          style={{ background: 'var(--tint-purple)', color: 'var(--color-primary-dark)', flexShrink: 0 }}
        >
          <ChipIcon name="shield" />
        </span>
        <p className="sub" style={{ margin: 0 }}>
          이미 먹고 있는 영양제가 있다면 알려주세요. 상한 섭취량 초과 여부를 확인해드릴게요.
        </p>
      </div>

      <p className="sub" style={{ marginTop: 8 }}>
        지금 드시는 영양제가 있나요? (여러 개 추가 가능)
      </p>
      <form onSubmit={addSupplement} style={{ display: 'flex', gap: 8 }}>
        <input
          className="text-input"
          type="text"
          placeholder="성분명 입력 (예: 비타민A)"
          value={supplementInput}
          onChange={(e) => setSupplementInput(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button
          className="btn"
          type="submit"
          style={{ width: 'auto', padding: '12px 18px', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          추가
        </button>
      </form>

      {supplements.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {supplements.map((supplement, index) => (
            <span
              className="tag"
              key={`${supplement}-${index}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {supplement}
              <button
                type="button"
                onClick={() => removeSupplement(index)}
                aria-label={`${supplement} 삭제`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'inherit',
                  fontWeight: 700,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        className="btn"
        type="button"
        onClick={() => onNext(recommendedIngredients.map((i) => i.id))}
      >
        다음
      </button>
    </>
  );
}
