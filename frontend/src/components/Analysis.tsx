import { useState } from 'react';
import type { FormEvent } from 'react';
import { SYMPTOM_INGREDIENTS, INGREDIENT_ICONS } from '../mockData';
import { ChipIcon, getChipColor } from '../chipIcons';

interface AnalysisProps {
  symptoms: string[];
  onNext: () => void;
}

export function Analysis({ symptoms, onNext }: AnalysisProps) {
  const [supplementInput, setSupplementInput] = useState('');
  const [supplements, setSupplements] = useState<string[]>([]);

  const recommendedIngredients = Array.from(
    new Set(symptoms.flatMap((symptom) => SYMPTOM_INGREDIENTS[symptom] ?? []))
  );

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

      <div className="chip-list">
        {recommendedIngredients.map((ingredient, index) => {
          const color = getChipColor(index);
          return (
            <span className="chip-badge" key={ingredient}>
              <span className="chip-icon" style={{ background: color.tint, color: color.accent }}>
                <ChipIcon name={INGREDIENT_ICONS[ingredient] ?? 'droplet'} />
              </span>
              <span className="chip-label">{ingredient}</span>
            </span>
          );
        })}
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
        />
        <button className="btn" type="submit" style={{ width: 'auto', padding: '12px 18px' }}>
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

      <button className="btn" type="button" onClick={onNext}>
        다음
      </button>
    </>
  );
}
