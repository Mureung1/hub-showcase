import { useEffect, useState } from 'react';
import './TideCheck.css';

const API_BASE = 'http://localhost:4000';

// onDone은 선택적 props — App처럼 "TideCheck 끝나면 다음 화면으로" 흐름이 필요할 때만 넘겨준다.
function TideCheck({ onDone }) {
  const [valence, setValence] = useState(62);
  const [arousal, setArousal] = useState(40);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  // 페이지 로드 시 마지막 tide check 값을 불러와 화면에 반영
  useEffect(() => {
    fetch(`${API_BASE}/api/tide-checks/latest`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setLastCheck(data);
      })
      .catch(() => {
        // 서버가 아직 안 떠 있거나 저장된 값이 없으면 조용히 무시
      });
  }, []);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tide-checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valence, arousal }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || '저장에 실패했어요.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="tide-check">
        <div className="tide-done">
          <div className="check">🌊</div>
          <div className="msg">오늘의 tide를 기록했어요</div>
          <div className="values">
            valence {valence} · arousal {arousal}
          </div>
        </div>
        <button className="tide-reset" onClick={() => setSubmitted(false)}>
          다시 체크하기
        </button>
        {onDone && (
          <button className="tide-submit" onClick={onDone} style={{ marginTop: 12 }}>
            계속하기 →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="tide-check">
      <h1>Tide Check</h1>
      <p className="subtitle">
        Once a day, minimum — plus anytime via "Update your tide."
      </p>

      {lastCheck && (
        <p className="subtitle" style={{ marginTop: -20, marginBottom: 24 }}>
          지난 기록: valence {lastCheck.valence} · arousal {lastCheck.arousal}
        </p>
      )}

      <div className="tide-question">
        <label>How are you feeling right now?</label>
        <input
          type="range"
          min="0"
          max="100"
          value={valence}
          onChange={(e) => setValence(Number(e.target.value))}
          className="tide-slider"
        />
        <div className="tide-endlabels">
          <span>Cloudy</span>
          <span>Clear</span>
        </div>
      </div>

      <div className="tide-question">
        <label>How awake do you feel right now?</label>
        <input
          type="range"
          min="0"
          max="100"
          value={arousal}
          onChange={(e) => setArousal(Number(e.target.value))}
          className="tide-slider"
        />
        <div className="tide-endlabels">
          <span>Calm</span>
          <span>Rippling</span>
        </div>
      </div>

      {error && (
        <p className="subtitle" style={{ color: '#e5484d', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <button className="tide-submit" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving…' : 'Submit'}
      </button>
    </div>
  );
}

export default TideCheck;
