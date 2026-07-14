import { useState } from 'react';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [totalDraft, setTotalDraft] = useState('');
  const [majorDraft, setMajorDraft] = useState('');
  const [generalDraft, setGeneralDraft] = useState('');
  const [submitted, setSubmitted] = useState(null);

  return (
    <div className="App">
      <p className="eyebrow">Course Basket</p>
      <h1>졸업요건을 입력해주세요</h1>
      <p className="sub">
        입력한 요건은 요약 바에서 확인하고 언제든 다시 수정할 수 있어요.
      </p>

      <button type="button" className="cta" onClick={() => setShowModal(true)}>
        졸업요건 입력하기
      </button>

      {submitted && (
        <div className="req-summary-bar">
          <button
            type="button"
            className="req-summary-group"
            onClick={() => setShowModal(true)}
          >       
            [졸업요건] 총 {submitted.total}학점 · 전공 {submitted.major}학점 · 교양 {submitted.general}학점
          </button>
        </div>
      )}

      {showModal && (
        <div className="req-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="req-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="req-modal-close"
              onClick={() => setShowModal(false)}
              aria-label="닫기"
            >
              ✕
            </button>
            <h2 className="req-modal-title">졸업요건을 입력해주세요</h2>
            <p className="req-modal-sub">
              입력한 요건은 아래 요약 바에서 확인하고 언제든 다시 수정할 수 있어요.
            </p>

            <div className="req-field">
              <label htmlFor="reqTotalInput">총 졸업학점</label>
              <input
                id="reqTotalInput"
                type="number"
                value={totalDraft}
                onChange={(e) => setTotalDraft(e.target.value)}
                placeholder="예: 130"
              />
            </div>

            <div className="req-field">
              <label htmlFor="reqMajorInput">전공 학점</label>
              <input
                id="reqMajorInput"
                type="number"
                value={majorDraft}
                onChange={(e) => setMajorDraft(e.target.value)}
                placeholder="예: 51"
              />
            </div>

            <div className="req-field">
              <label htmlFor="reqGeneralInput">교양 학점</label>
              <input
                id="reqGeneralInput"
                type="number"
                value={generalDraft}
                onChange={(e) => setGeneralDraft(e.target.value)}
                placeholder="예: 30"
              />
            </div>

            <button
              type="button"
              className="cta req-modal-submit"
              onClick={() => {
                setSubmitted({
                  total: totalDraft,
                  major: majorDraft,
                  general: generalDraft,
                });
                setShowModal(false);
              }}
            >
              적용하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;