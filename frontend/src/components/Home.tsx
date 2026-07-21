import { useState } from 'react';
import { ChipIcon, getChipColor } from '../chipIcons';
import type { ChipIconName } from '../chipIcons';

const SYMPTOM_OPTIONS: { label: string; icon: ChipIconName }[] = [
  { label: '피로', icon: 'battery' },
  { label: '소화불량', icon: 'stomach' },
  { label: '수면장애', icon: 'moon' },
  { label: '눈 피로', icon: 'eye' },
  { label: '관절 통증', icon: 'joint' },
  { label: '스트레스', icon: 'zigzag' },
  { label: '면역력 저하', icon: 'shield' },
  { label: '피부 트러블', icon: 'droplet' },
];

const LIFE_PATTERN_OPTIONS: { label: string; icon: ChipIconName }[] = [
  { label: '사무직', icon: 'briefcase' },
  { label: '교대/야간 근무', icon: 'moon' },
  { label: '잦은 음주', icon: 'glass' },
  { label: '흡연', icon: 'smoke' },
  { label: '임신·수유 중', icon: 'heart' },
  { label: '채식 위주 식단', icon: 'leaf' },
  { label: '규칙적 운동 부족', icon: 'dumbbell' },
];

interface HomeProps {
  onStart: (symptoms: string[]) => void;
}

export function Home({ onStart }: HomeProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedLifePatterns, setSelectedLifePatterns] = useState<string[]>([]);

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
      <p className="sub" style={{ marginTop: -8 }}>
        해당하는 증상을 모두 골라주세요. 증상에 맞는 성분을 분석해드려요.
      </p>

      <div className="chip-list">
        {SYMPTOM_OPTIONS.map((symptom, index) => {
          const color = getChipColor(index);
          const checked = selectedSymptoms.includes(symptom.label);
          return (
            <label className={checked ? 'chip-row checked' : 'chip-row'} key={symptom.label}>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggleSymptom(symptom.label)}
              />
              <span className="chip-icon" style={{ background: color.tint, color: color.accent }}>
                <ChipIcon name={symptom.icon} />
              </span>
              <span className="chip-label">{symptom.label}</span>
            </label>
          );
        })}
      </div>

      <p className="sub" style={{ marginTop: 8 }}>
        생활 패턴
      </p>

      <div className="chip-list">
        {LIFE_PATTERN_OPTIONS.map((pattern, index) => {
          const color = getChipColor(index);
          const checked = selectedLifePatterns.includes(pattern.label);
          return (
            <label className={checked ? 'chip-row checked' : 'chip-row'} key={pattern.label}>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggleLifePattern(pattern.label)}
              />
              <span className="chip-icon" style={{ background: color.tint, color: color.accent }}>
                <ChipIcon name={pattern.icon} />
              </span>
              <span className="chip-label">{pattern.label}</span>
            </label>
          );
        })}
      </div>

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
