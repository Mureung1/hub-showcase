import RequirementModal from './components/RequirementModal';
import DashboardSection from './components/DashboardSection';
import { useState } from 'react';

function App() {
  // 졸업요건 입력 모달
  const [showModal, setShowModal] = useState(false);
  const [totalDraft, setTotalDraft] = useState('');
  const [majorDraft, setMajorDraft] = useState('');
  const [generalDraft, setGeneralDraft] = useState('');
  const [submitted, setSubmitted] = useState(null);

  // 현재까지 이수학점 입력 모달
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progTotalDraft, setProgTotalDraft] = useState('');
  const [progMajorDraft, setProgMajorDraft] = useState('');
  const [progGeneralDraft, setProgGeneralDraft] = useState('');
  const [progressSubmitted, setProgressSubmitted] = useState(null);

  //mock data
  const requirementRows = [
  { name: '총 이수학점', pct: 65 },
  { name: '전공 학점', pct: 70 },
  { name: '교양 학점', pct: 55 },
  { name: '특수 학점', pct: 90 },
];

const badges = [
  { label: '다중전공', done: false },
  { label: '현장실습', done: true },
  { label: '해외학점', done: false },
  { label: '창업교과목', done: true },
];

const gapList = ['전공 선택 6학점 부족', '종합설계교과목 미이수'];
  
  return (
    <div className="app">
      <p className="eyebrow">Course Basket</p>
      <h1>졸업요건을 입력해주세요</h1>
      <p className="sub">
        입력한 요건은 요약 바에서 확인하고 언제든 다시 수정할 수 있어요.
      </p>

      <button type="button" className="cta" onClick={() => setShowModal(true)}>
        졸업요건 입력하기
      </button>{' '}
      <button
        type="button"
        className="cta"
        onClick={() => setShowProgressModal(true)}
      >
        현재까지 이수학점 입력하기
      </button>

      {(submitted || progressSubmitted) && (
        <div className="req-summary-bar">
          {submitted && (
            <button
              type="button"
              className="req-summary-group"
              onClick={() => setShowModal(true)}
            >
              [졸업요건] 총 {submitted.total}학점 · 전공 {submitted.major}학점 · 교양 {submitted.general}학점
            </button>
          )}

          {submitted && progressSubmitted && (
            <span className="req-summary-sep">/</span>
          )}

          {progressSubmitted && (
            <button
              type="button"
              className="req-summary-group"
              onClick={() => setShowProgressModal(true)}
            >
              [현재까지] 총 {progressSubmitted.total}학점 · 전공 {progressSubmitted.major}학점 · 교양 {progressSubmitted.general}학점
            </button>
          )}
        </div>
      )}
      {showModal && (
  <RequirementModal
    idPrefix="req"
    title="졸업요건을 입력해주세요"
    subtitle="입력한 요건은 아래 요약 바에서 확인하고 언제든 다시 수정할 수 있어요."
    totalLabel="총 졸업학점"
    majorLabel="전공 학점"
    generalLabel="교양 학점"
    totalValue={totalDraft}
    majorValue={majorDraft}
    generalValue={generalDraft}
    onTotalChange={setTotalDraft}
    onMajorChange={setMajorDraft}
    onGeneralChange={setGeneralDraft}
    onClose={() => setShowModal(false)}
    onSubmit={() => {
      setSubmitted({ total: totalDraft, major: majorDraft, general: generalDraft });
      setShowModal(false);
    }}
  />
)}

{showProgressModal && (
  <RequirementModal
    idPrefix="prog"
    title="지금까지 들은 학점을 기입해주세요"
    subtitle="입력한 이수 학점은 아래 요약 바에서 확인하고 언제든 다시 수정할 수 있어요."
    totalLabel="총 이수 학점"
    majorLabel="전공 이수 학점"
    generalLabel="교양 이수 학점"
    totalValue={progTotalDraft}
    majorValue={progMajorDraft}
    generalValue={progGeneralDraft}
    onTotalChange={setProgTotalDraft}
    onMajorChange={setProgMajorDraft}
    onGeneralChange={setProgGeneralDraft}
    onClose={() => setShowProgressModal(false)}
    onSubmit={() => {
      setProgressSubmitted({ total: progTotalDraft, major: progMajorDraft, general: progGeneralDraft });
      setShowProgressModal(false);
    }}
  />
)}
<DashboardSection
  requirementRows={requirementRows}
  badges={badges}
  gapList={gapList}
/>
</div>
  );
}

export default App;