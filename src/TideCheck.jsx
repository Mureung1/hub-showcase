import { useState } from 'react';
import './TideCheck.css';

// onDone은 선택적 props — App처럼 "TideCheck 끝나면 다음 화면으로" 흐름이 필요할 때만 넘겨준다.
function TideCheck({ onDone }) {
  const [valence, setValence] = useState(62);
  const [arousal, setArousal] = useState(40);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    // mock — 실제 저장은 Task 5에서 fetch(POST /api/tide-checks)로 교체
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="tide-check">
        <div className="tide-done">
          <div className="check">🌊</div>
          <div className="msg">오늘의 tide를 기록했어요</div>
          <div className="values">valence {valence} · arousal {arousal}</div>
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

      <button className="tide-submit" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
}

export default TideCheck;
