import { useState } from 'react';

const SYMPTOM_OPTIONS = ['피로감', '안구건조', '수면 부족', '소화불량'];

interface HomeProps {
  onStart: (symptoms: string[]) => void;
}

export function Home({ onStart }: HomeProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['피로감', '안구건조']);

  function toggleSymptom(symptom: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  }

  function handleStart() {
    onStart(selectedSymptoms);
  }

  return (
    <>
      <span className="tag" style={{ alignSelf: 'flex-start' }}>AI 추천</span>
      <h1 className="heading" style={{ fontSize: 24 }}>
        오늘 컨디션은
        <br />
        어떠세요?
      </h1>

      {SYMPTOM_OPTIONS.map((symptom) => (
        <label className="check-row" key={symptom}>
          <input
            type="checkbox"
            checked={selectedSymptoms.includes(symptom)}
            onChange={() => toggleSymptom(symptom)}
          />
          {symptom}
        </label>
      ))}

      <p className="sub">생활 패턴: 사무직 · 야간 활동</p>

      <button
        className="btn"
        type="button"
        disabled={selectedSymptoms.length === 0}
        onClick={handleStart}
      >
        진단 시작하기
      </button>
    </>
  );
}
