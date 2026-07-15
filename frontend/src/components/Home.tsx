import { useState } from 'react';

const SYMPTOM_OPTIONS = ['피로감', '안구건조', '수면 부족', '소화불량'];

const LIFE_PATTERN_OPTIONS = [
  '사무직',
  '교대/야간 근무',
  '잦은 음주',
  '흡연',
  '임신·수유 중',
  '채식 위주 식단',
  '규칙적 운동 부족',
];

interface HomeProps {
  onStart: (symptoms: string[]) => void;
}

export function Home({ onStart }: HomeProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['피로감', '안구건조']);
  const [selectedLifePatterns, setSelectedLifePatterns] = useState<string[]>([
    '사무직',
    '교대/야간 근무',
  ]);

  function toggleSymptom(symptom: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  }

  function toggleLifePattern(pattern: string) {
    setSelectedLifePatterns((prev) =>
      prev.includes(pattern)
        ? prev.filter((p) => p !== pattern)
        : [...prev, pattern]
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

      <p className="sub" style={{ marginTop: 8 }}>
        생활 패턴
      </p>

      {LIFE_PATTERN_OPTIONS.map((pattern) => (
        <label className="check-row" key={pattern}>
          <input
            type="checkbox"
            checked={selectedLifePatterns.includes(pattern)}
            onChange={() => toggleLifePattern(pattern)}
          />
          {pattern}
        </label>
      ))}

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
