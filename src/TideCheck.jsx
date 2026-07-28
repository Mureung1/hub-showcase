import { useEffect, useState } from 'react';
import TideSlider from './TideSlider';
import { hasCheckedInToday } from './hasCheckedInToday';
import { API_BASE } from './apiBase';
import './TideCheck.css';

// onDone은 선택적 props — App처럼 "TideCheck 끝나면 다음 화면으로" 흐름이 필요할 때만 넘겨준다.
function TideCheck({ onDone }) {
  const [valence, setValence] = useState(62);
  const [arousal, setArousal] = useState(40);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  // 페이지 로드 시 마지막 tide check 값을 불러와 화면에 반영.
  // 404(아직 기록 없음)는 정상 케이스라 에러로 취급하지 않는다.
  useEffect(() => {
    fetch(`${API_BASE}/api/tide-checks/latest`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('server');
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setLastCheck(data);
        // 오늘 이미 체크인했으면 폼 대신 완료 화면부터 보여준다
        if (hasCheckedInToday(data)) {
          setValence(data.valence);
          setArousal(data.arousal);
          setSubmitted(true);
        }
      })
      .catch(() => {
        setLoadError('지난 기록을 불러오지 못했어요. 서버 연결을 확인해주세요.');
      });
  }, []);

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    let res;
    try {
      res = await fetch(`${API_BASE}/api/tide-checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valence, arousal }),
      });
    } catch {
      // fetch 자체가 실패 — 네트워크가 끊겼거나 서버가 안 떠 있는 경우
      setError('서버에 연결할 수 없어요. 네트워크를 확인해주세요.');
      setSaving(false);
      return;
    }

    if (!res.ok) {
      // 서버는 응답했지만 4xx/5xx — 서버가 준 메시지를 그대로 보여준다
      const body = await res.json().catch(() => ({}));
      setError(body.error || '저장에 실패했어요.');
      setSaving(false);
      return;
    }

    setSubmitted(true);
    setSaving(false);
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

      {loadError && (
        <p className="subtitle" style={{ color: '#e5484d', marginTop: -20, marginBottom: 24 }}>
          {loadError}
        </p>
      )}

      <div className="tide-question">
        <label>How are you feeling right now?</label>
        <TideSlider value={valence} onChange={setValence} />
        <div className="tide-endlabels">
          <span>Cloudy</span>
          <span>Clear</span>
        </div>
      </div>

      <div className="tide-question">
        <label>How awake do you feel right now?</label>
        <TideSlider value={arousal} onChange={setArousal} />
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
        {saving ? 'Saving…' : error ? '다시 시도' : 'Submit'}
      </button>
    </div>
  );
}

export default TideCheck;
