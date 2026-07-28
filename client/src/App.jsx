import { Routes, Route } from 'react-router-dom';
import RequirementModal from './components/RequirementModal';
import DashboardSection from './components/DashboardSection';
import CourseBasketSection from './components/CourseBasketSection';
import MajorSelectModal from './components/MajorSelectModal';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import SimulationPage from './pages/SimulationPage';
import ChatWidget from './components/ChatWidget';
import { evaluateTrackRequirements } from './utils/gradRequirements';
import { canAddCourse } from './utils/creditCap';
import { useState, useEffect } from 'react';

// 로컬 개발 중엔 client/.env.local의 VITE_API_URL이 없으면 localhost:4000으로 폴백,
// 배포 환경(Vercel)에서는 프로젝트 환경변수로 Render 서버 주소를 넣어준다.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const COURSES_URL = `${API_BASE_URL}/api/courses`;
const CREDIT_CAP = 18; // 이번 학기 수강신청 상한 (GPA 3.7 이상 21학점 상한은 아직 미구현)
const SESSION_KEY = 'basketSessionId';

// 로그인 시스템이 없어 브라우저별로 세션 id를 하나 발급해 localStorage에 고정해두고,
// 바구니 관련 요청마다 실어 보낸다 — 이걸로 서버(Supabase basket_items)에서
// "누구 바구니인지"를 구분한다.
function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function App() {
  const [sessionId] = useState(getOrCreateSessionId);
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

  const [basketCourses, setBasketCourses] = useState([]);

  // 수강 바구니 화면에 어느 학년 과목을 보여줄지 (기본 1학년) — 학점 계산과는 무관, 화면 표시 전용 필터
  const [selectedGrade, setSelectedGrade] = useState(1);
  const visibleCourses = basketCourses.filter((c) => c.grade === selectedGrade);

  const [selectedIds, setSelectedIds] = useState([]);
  // 담긴 과목(catalog course id) -> 그 과목을 저장한 basket_items 행의 실제 DB id.
  // 뺄 때 어느 행을 DELETE해야 하는지 알기 위해 필요하다.
  const [basketRowIds, setBasketRowIds] = useState({});
  // 18학점 상한에 걸렸을 때 3초간 띄우는 안내 메시지
  const [capMessage, setCapMessage] = useState(null);

  const API_URL = `${API_BASE_URL}/api/basket`;

  useEffect(() => {
    if (!capMessage) return undefined;
    const timer = setTimeout(() => setCapMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [capMessage]);

  // 마운트 시 실제 교과목 목록을 서버(학사 데이터 기반)에서 불러온다
  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch(COURSES_URL);
        const data = await res.json();
        setBasketCourses(data);
      } catch (err) {
        console.error('과목 목록 불러오기 실패:', err);
      }
    }
    fetchCourses();
  }, []);

  // 마운트 시 서버에 이미 저장된 과목들을 불러와 선택 상태에 반영
  // (basketCourses가 위 fetchCourses로 비동기로 채워지므로, 그 값이 갱신될 때마다 다시 매칭한다)
  useEffect(() => {
    async function fetchBasketItems() {
      try {
        const res = await fetch(`${API_URL}?session_id=${sessionId}`);
        const items = await res.json();
        const matched = items
          .map((item) => {
            const course = basketCourses.find((c) => c.name === item.course_name);
            return course ? { courseId: course.id, rowId: item.id } : null;
          })
          .filter((m) => m !== null);
        setSelectedIds([...new Set(matched.map((m) => m.courseId))]);
        setBasketRowIds((prev) => {
          const next = { ...prev };
          matched.forEach((m) => {
            next[m.courseId] = m.rowId;
          });
          return next;
        });
      } catch (err) {
        console.error('바구니 불러오기 실패:', err);
      }
    }
    fetchBasketItems();
  }, [basketCourses, sessionId, API_URL]);

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
    const course = basketCourses.find((c) => c.id === id);

    if (!alreadySelected) {
      // 담으려는 과목까지 더했을 때 이번 학기 상한(18학점)을 넘으면 담지 않고 안내만 띄운다
      if (!canAddCourse(totalPicked, course.credits, CREDIT_CAP)) {
        setCapMessage('더 이상 담을 수 없습니다.');
        return;
      }

      // 화면은 즉시 반응하도록 먼저 로컬 state 업데이트
      setSelectedIds((prev) => [...prev, id]);
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_name: course.name,
            credits: course.credits,
            is_major: course.category === '전공필수' || course.category === '전공',
            session_id: sessionId,
          }),
        });
        const saved = await res.json();
        setBasketRowIds((prev) => ({ ...prev, [id]: saved.id }));
      } catch (err) {
        console.error('저장 실패:', err);
      }
    } else {
      setSelectedIds((prev) => prev.filter((cid) => cid !== id));

      // 서버에도 실제로 지운다 (예전엔 로컬만 바뀌고 basket_items에는 그대로 남아있었다)
      const rowId = basketRowIds[id];
      if (rowId !== undefined) {
        try {
          await fetch(`${API_URL}/${rowId}?session_id=${sessionId}`, { method: 'DELETE' });
          setBasketRowIds((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        } catch (err) {
          console.error('삭제 실패:', err);
        }
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



  // evaluateTrackRequirements가 요구하는 형태({ name, credits, category, specialTags })로 변환.
  // specialTags(창업교과목/종합설계교과목 등)는 category와 별개 필드라 함께 실어 보내야
  // 트랙 특수요건 뱃지가 정상 판정된다. credits는 프로젝트 전체 관례(basketCourses의
  // 필드명)에 맞춘 것이다 — 예전엔 credit 단수였는데 gradRequirements.js를 credits로
  // 통일하면서 여기도 같이 맞췄다.
  const completedCourses = selectedCourses.map((c) => ({
    name: c.name,
    credits: c.credits,
    category: c.category,
    specialTags: c.specialTags,
  }));

  // 트랙이 없는 전공이거나 아직 트랙을 선택하지 않았으면 판정 결과 없이 전부 미충족으로 처리
  const requirementResults = gradInfo?.track
    ? evaluateTrackRequirements(completedCourses, gradInfo.track)
    : {};

  const isSatisfied = (label) => requirementResults[label]?.satisfied ?? false;

  const badges = [
    { label: '다중전공', done: isSatisfied('다중전공 이수') },
    { label: '현장실습', done: isSatisfied('현장실습') },
    { label: '해외학점', done: isSatisfied('해외대학 인정학점') },
    { label: '창업교과목', done: isSatisfied('창업교과목') },
    { label: '종합설계', done: isSatisfied('종합설계교과목') },
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
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/basket"
          element={
            <>
              <Header />
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

                <div className="basket-toolbar">
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

                  <div className="grade-filter">
                    {[1, 2, 3, 4].map((g) => (
                      <button
                        key={g}
                        type="button"
                        className={`grade-filter-item ${selectedGrade === g ? 'active' : ''}`}
                        onClick={() => setSelectedGrade(g)}
                      >
                        {g}학년
                      </button>
                    ))}
                  </div>
                </div>
                <CourseBasketSection
                  courses={visibleCourses}
                  selectedIds={selectedIds}
                  onToggle={toggleCourse}
                />

                {capMessage && <div className="cap-toast">{capMessage}</div>}

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
            </>
          }
        />

        <Route
          path="/simulation"
          element={
            <>
              <Header />
              <div className="app">
                {!gradInfo && <MajorSelectModal onConfirm={handleMajorConfirm} />}

                <SimulationPage
                  combinedTotal={combinedTotal}
                  combinedMajor={combinedMajor}
                  combinedGeneral={combinedGeneral}
                  goalTotal={goalTotal}
                  goalMajor={goalMajor}
                  goalGeneral={goalGeneral}
                  basketCourses={basketCourses}
                />
              </div>
            </>
          }
        />
      </Routes>

      <ChatWidget
        goalTotal={goalTotal}
        goalMajor={goalMajor}
        goalGeneral={goalGeneral}
        progressSubmitted={progressSubmitted}
        basketCourses={completedCourses}
        track={gradInfo?.track}
      />
    </>
  );
}

export default App;
