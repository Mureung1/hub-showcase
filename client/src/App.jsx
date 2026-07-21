import RequirementModal from './components/RequirementModal';
import DashboardSection from './components/DashboardSection';
import CourseBasketSection from './components/CourseBasketSection';
import MajorSelectModal from './components/MajorSelectModal';
import { useState } from 'react';

function App() {
  // 졸업요건 입력 모달
  const [gradInfo, setGradInfo] = useState(() => {
  const saved = localStorage.getItem('gradInfo');
  return saved ? JSON.parse(saved) : null;
});
  // gradInfo로부터 파생 — 새로고침 후에도 요약 바가 유지되도록 별도 state로 두지 않음
  const submitted = gradInfo
    ? {
        total: String(gradInfo.totalCredits),
        major: String(gradInfo.majorCredits),
        general: String(gradInfo.generalCredits),
      }
    : null;

  // 현재까지 이수학점 입력 모달
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progTotalDraft, setProgTotalDraft] = useState('');
  const [progMajorDraft, setProgMajorDraft] = useState('');
  const [progGeneralDraft, setProgGeneralDraft] = useState('');
  // 초기값을 localStorage에서 불러오기
  const [progressSubmitted, setProgressSubmitted] = useState(() => {
  const saved = localStorage.getItem('progressSubmitted');
  return saved ? JSON.parse(saved) : null;
});

  const basketCourses = [
  { id: 1, name: '운영체제', category: '전공필수', credits: 3 },
  { id: 2, name: '소프트웨어설계', category: '전공', credits: 3 },
  { id: 3, name: '데이터통신', category: '전공', credits: 3 },
  { id: 4, name: '인공지능', category: '전공', credits: 3 },
  { id: 5, name: '데이터베이스', category: '전공', credits: 3 },
  { id: 6, name: 'SW융합설계1', category: '종합설계', credits: 3 },
  { id: 7, name: '기업과정신과 벤처창업', category: '창업교과목', credits: 3 },
  { id: 8, name: '서양의 역사와 문화', category: '교양', credits: 3 },
  { id: 9, name: '세계문화와다양성', category: '일반선택', credits: 3 },
];
  
  const [selectedIds, setSelectedIds] = useState([]);

  const API_URL = 'http://localhost:4000/api/basket';

  function handleMajorConfirm(info) {
  setGradInfo(info);
  localStorage.setItem('gradInfo', JSON.stringify(info)); // 추가
}
  function resetMajor() {
  setGradInfo(null);
  localStorage.removeItem('gradInfo');
}

  async function toggleCourse(id) {
    const alreadySelected = selectedIds.includes(id);

  // 화면은 즉시 반응하도록 먼저 로컬 state 업데이트
    setSelectedIds((prev) =>
      alreadySelected ? prev.filter((cid) => cid !== id) : [...prev, id]
  );

  // 새로 담는 경우에만 서버에 저장 (뺄 때는 일단 로컬만 — 삭제 API는 다음 단계)
  if (!alreadySelected) {
    const course = basketCourses.find((c) => c.id === id);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_name: course.name,
          credits: course.credits,
          is_major: course.category === '전공필수' || course.category === '전공',
        }),
      });
      const saved = await res.json();
      console.log('저장됨:', saved);
    } catch (err) {
      console.error('저장 실패:', err);
    }
  }
}

  const selectedCourses = basketCourses.filter((c) => selectedIds.includes(c.id));
  const totalPicked = selectedCourses.reduce((sum, c) => sum + c.credits, 0);
  const majorPicked = selectedCourses
    .filter((c) => c.category === '전공필수' || c.category === '전공')
    .reduce((sum, c) => sum + c.credits, 0);
  const generalPicked = selectedCourses
    .filter((c) => c.category === '교양' || c.category === '일반선택')
    .reduce((sum, c) => sum + c.credits, 0);

  const goalTotal = submitted ? Number(submitted.total) : 130;
  const goalMajor = submitted ? Number(submitted.major) : 51;
  const goalGeneral = submitted ? Number(submitted.general) : 30;

  const progTotalDone = progressSubmitted ? Number(progressSubmitted.total) : 0;
  const progMajorDone = progressSubmitted ? Number(progressSubmitted.major) : 0;
  const progGeneralDone = progressSubmitted ? Number(progressSubmitted.general) : 0;

  //대시보드용 합산값 계산
  const combinedTotal = progTotalDone + totalPicked;
  const combinedMajor = progMajorDone + majorPicked;
  const combinedGeneral = progGeneralDone + generalPicked;

  const requirementRows = [
  { name: '총학점', done: combinedTotal, goal: goalTotal, pct: Math.min(100, Math.round((combinedTotal / goalTotal) * 100)) },
  { name: '전공', done: combinedMajor, goal: goalMajor, pct: Math.min(100, Math.round((combinedMajor / goalMajor) * 100)) },
  { name: '교양', done: combinedGeneral, goal: goalGeneral, pct: Math.min(100, Math.round((combinedGeneral / goalGeneral) * 100)) },
];
  
  

  const hasCategory = (cat) => selectedCourses.some((c) => c.category === cat);
  const badges = [
    { label: '다중전공', done: false },
    { label: '현장실습', done: true },
    { label: '해외학점', done: false },
    { label: '창업교과목', done: hasCategory('창업교과목') },
    { label: '종합설계', done: hasCategory('종합설계') },
  ];

  const gapList = [];

const totalGap = goalTotal - combinedTotal;
const majorGap = goalMajor - combinedMajor;
const generalGap = goalGeneral - combinedGeneral;

if (totalGap > 0) gapList.push(`총학점 ${totalGap}학점 부족`);
if (majorGap > 0) gapList.push(`전공 ${majorGap}학점 부족`);
if (generalGap > 0) gapList.push(`교양 ${generalGap}학점 부족`);

badges.forEach((badge) => {
  if (!badge.done && (badge.label !== '다중전공' && badge.label !== '해외학점')) gapList.push(`${badge.label} 미이수`);
});

if (gapList.length === 0) gapList.push('모든 요건을 충족했어요 🎉');

  return (
    <div className="app">
      {!gradInfo && <MajorSelectModal onConfirm={handleMajorConfirm} />}
      <div className="hero-header">
      <p className="eyebrow">Course Basket</p>
      <h1>이번 학기 후보 과목, 담아볼까요?</h1>
      <p className="sub">
        아래 과목들을 선택하여 이번 학기의 수업을 계획해보세요.
      </p>
      
      <button
        type="button"
        className="cta"
        onClick={() => setShowProgressModal(true)}
      >
        현재까지 이수학점 입력하기
      </button>
    </div>

      {(submitted || progressSubmitted) && (
        <div className="req-summary-bar">
          {submitted && (
            <div className="req-summary-group">
              [졸업요건] 총 {submitted.total}학점 · 전공 {submitted.major}학점 · 교양 {submitted.general}학점
              <button type="button" className="req-summary-edit" onClick={resetMajor}>
                학과 다시 선택
              </button>
            </div>
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
          <div className="label">총 학점</div>
          <div className="frac">{combinedTotal}/{goalTotal}</div>
        </div>
        <div className="summary-stat">
          <div className="label">전공 학점</div>
          <div className="frac">{combinedMajor}/{goalMajor}</div>
        </div>
      </div>

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
            const progress = { total: progTotalDraft, major: progMajorDraft, general: progGeneralDraft };
            setProgressSubmitted(progress);
            localStorage.setItem('progressSubmitted', JSON.stringify(progress)); // 추가
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