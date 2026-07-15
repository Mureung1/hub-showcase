import { useState } from 'react';
import { SYMPTOM_INGREDIENTS } from '../mockData';

interface AnalysisProps {
  symptoms: string[];
  onNext: () => void;
}

export function Analysis({ symptoms, onNext }: AnalysisProps) {
  const [supplementInput, setSupplementInput] = useState('');

  const recommendedIngredients = Array.from(
    new Set(symptoms.flatMap((symptom) => SYMPTOM_INGREDIENTS[symptom] ?? []))
  );

  return (
    <>
      <h1 className="heading" style={{ fontSize: 22 }}>
        이 성분이
        <br />
        필요해요
      </h1>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {recommendedIngredients.map((ingredient) => (
          <span className="tag-g" key={ingredient}>
            {ingredient}
          </span>
        ))}
      </div>

      <p className="sub" style={{ marginTop: 8 }}>
        지금 드시는 영양제가 있나요?
      </p>
      <input
        className="text-input"
        type="text"
        placeholder="성분명 검색 (예: 비타민A)"
        value={supplementInput}
        onChange={(e) => setSupplementInput(e.target.value)}
      />

      <button className="btn" type="button" onClick={onNext}>
        다음
      </button>
    </>
  );
}
