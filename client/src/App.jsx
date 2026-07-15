import RequirementModal from './components/RequirementModal';
import DashboardSection from './components/DashboardSection';
import CourseBasketSection from './components/CourseBasketSection';
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

  const basketCourses = [
  { id: 1, name: '운영체제', category: '전공필수', credits: 3 },
  { id: 2, name: '소프트웨어설계', category: '전공', credits: 3 },
  { id: 3, name: '데이터통신', category: '전공', credits: 3 },
  { id: 4, name: '인공지능', category: '전공', credits: 3 },
  { id: 5, name: '데이터베이스개론', category: '전공', credits: 3 },
  { id: 6, name: 'SW융합설계1', category: '종합설계', credits: 3 },
  { id: 7, name: '기업과정신과 벤처창업', category: '창업교과목', credits: 3 },
  { id: 8, name: '서양의 역사와 문화', category: '교양', credits: 3 },
  { id: 9, name: '세계문화와다양성', category: '일반선택', credits: 3 },
];
  
  const [selectedIds, setSelectedIds] = useState([]);

  function toggleCourse(id) {
  setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
  );
}

  const selectedCourses = basketCourses.filter((c) => selectedIds.includes(c.id));
  const totalPicked = selectedCourses.reduce((sum, c) => sum + c.credits, 0);
  const majorPicked = selectedCourses
    .filter((c) => c.category === '전공필수' || c.category === '전공')
    .reduce((sum, c) => sum + c.credits, 0);

  const goalTotal = submitted ? Number(submitted.total) : 130;
  const goalMajor = submitted ? Number(submitted.major) : 51;

  const requirementRows = [
    { name: '총학점', pct: Math.min(100, Math.round((totalPicked / goalTotal) * 100)) },
    { name: '전공', pct: Math.min(100, Math.round((majorPicked / goalMajor) * 100)) },
    { name: '교양', pct: Math.min(100, Math.round((majorPicked / goalMajor) * 100)) },
  ];

const badges = [
  { label: '다중전공', done: false },
  { label: '현장실습', done: true },
  { label: '해외학점', done: false },
  { label: '창업교과목', done: true },
];

const gapList = ['(아래는 예시 데이터입니다)','전공 6학점 부족', '종합설계교과목 미이수'];

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
      <CourseBasketSection
        courses={basketCourses}
        selectedIds={selectedIds}
        onToggle={toggleCourse}
      />

      <div className="summary-bar">
        <div className="summary-stat">
          <div className="label">담은 총 학점</div>
          <div className="frac">{totalPicked}/{goalTotal}</div>
        </div>
        <div className="summary-stat">
          <div className="label">담은 전공 학점</div>
          <div className="frac">{majorPicked}/{goalMajor}</div>
        </div>
      </div>
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