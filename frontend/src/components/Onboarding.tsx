import { useState } from 'react';
import type { FormEvent } from 'react';
import { updateProfile } from '../api/profile';
import type { AuthUser } from '../api/auth';
import type { Gender } from '../types';

interface OnboardingProps {
  token: string;
  onComplete: (user: AuthUser) => void;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'other', label: '기타' },
];

export function Onboarding({ token, onComplete }: OnboardingProps) {
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthYear, setBirthYear] = useState('');
  const [isPregnantOrLactating, setIsPregnantOrLactating] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValid =
    gender !== '' && birthYear.trim() !== '' && heightCm.trim() !== '' && weightKg.trim() !== '';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid || gender === '') return;
    setError(null);
    setLoading(true);
    try {
      const user = await updateProfile(token, {
        gender,
        birthYear: Number(birthYear),
        isPregnantOrLactating: gender === 'female' ? isPregnantOrLactating : false,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
      });
      onComplete(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      <div
        className="card"
        style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}
      >
        <div>
          <h1 className="heading" style={{ fontSize: 19, marginBottom: 4 }}>
            내 정보 입력
          </h1>
          <p className="sub">성별과 나이에 맞는 정확한 성분을 추천해드릴게요</p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}
        >
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={gender === opt.value ? 'btn' : 'btn-outline'}
                style={{ flex: 1 }}
                onClick={() => setGender(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <input
            className="text-input"
            type="number"
            placeholder="출생연도 (예: 1995)"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            required
          />

          {gender === 'female' && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--text-muted)',
                textAlign: 'left',
              }}
            >
              <input
                type="checkbox"
                checked={isPregnantOrLactating}
                onChange={(e) => setIsPregnantOrLactating(e.target.checked)}
              />
              임신 중이거나 수유 중이에요
            </label>
          )}

          <input
            className="text-input"
            type="number"
            placeholder="키 (cm)"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            required
          />
          <input
            className="text-input"
            type="number"
            placeholder="몸무게 (kg)"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            required
          />

          {error && <div className="warn-box">{error}</div>}

          <button className="btn" type="submit" disabled={loading || !isValid}>
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
