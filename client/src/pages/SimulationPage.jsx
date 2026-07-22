import { useState, useEffect } from 'react';
import { calculateSemesterPlan } from '../utils/semesterPlan';
import CourseBasketSection from '../components/CourseBasketSection';
import ScenarioCard, { SEMESTERS } from '../components/ScenarioCard';

const SCENARIOS_STORAGE_KEY = 'scenarios';
const ACTIVE_INDEX_STORAGE_KEY = 'scenarioActiveIndex';

const isMajorCourse = (course) => course.category === '전공필수' || course.category === '전공';
const isGeneralCourse = (course) => course.category === '교양' || course.category === '일반선택';

function loadScenarios() {
  const saved = localStorage.getItem(SCENARIOS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // 손상된 값이면 기본값으로 대체
    }
  }
  return [{ id: 1, name: '계획안 1', semester: SEMESTERS[0], courseIds: [] }];
}

function loadActiveIndex(scenarioCount) {
  const saved = localStorage.getItem(ACTIVE_INDEX_STORAGE_KEY);
  const parsed = saved !== null ? Number(saved) : 0;
  const safe = Number.isFinite(parsed) ? parsed : 0;
  // 저장된 인덱스가 손상되었거나 시나리오 개수보다 크면 유효 범위로 되돌린다
  return Math.min(Math.max(safe, 0), scenarioCount);
}

function SimulationPage({
  combinedTotal,
  combinedMajor,
  combinedGeneral,
  goalTotal,
  goalMajor,
  goalGeneral,
  basketCourses,
}) {
  const [currentSemester, setCurrentSemester] = useState(SEMESTERS[0]);
  const [result, setResult] = useState(null);

  const [scenarios, setScenarios] = useState(loadScenarios);
  const [activeIndex, setActiveIndex] = useState(() => loadActiveIndex(loadScenarios().length));
  const [courseModalScenarioId, setCourseModalScenarioId] = useState(null);

  // scenarios/activeIndex가 바뀔 때마다 자동으로 localStorage에 저장 (새로고침해도 유지)
  useEffect(() => {
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
  }, [scenarios]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_INDEX_STORAGE_KEY, String(activeIndex));
  }, [activeIndex]);

  const handleCalculate = () => {
    setResult(
      calculateSemesterPlan({
        currentSemester,
        combinedTotal,
        combinedMajor,
        combinedGeneral,
        goalTotal,
        goalMajor,
        goalGeneral,
      })
    );
  };

  const needed =
    result && !result.error
      ? {
          total: result.perSemester.total.needed,
          major: result.perSemester.major.needed,
          general: result.perSemester.general.needed,
        }
      : null;

  // index === scenarios.length 는 아직 배열에 없는 "추가 카드" 자리를 의미한다.
  // 그 자리가 가운데로 오면(활성화되면) 실제로 새 시나리오를 생성해 그 자리를 채운다.
  const handleAddScenario = () => {
    const newIndex = scenarios.length;
    const nextId = scenarios.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    const firstSemester = scenarios[0]?.semester ?? SEMESTERS[0];
    const newScenario = {
      id: nextId,
      name: `계획안 ${scenarios.length + 1}`,
      semester: firstSemester,
      courseIds: [],
    };
    setScenarios((prev) => [...prev, newScenario]);
    setActiveIndex(newIndex);
  };

  const deleteScenario = (scenarioId) => {
    if (scenarios.length <= 1) return; // 최소 1개는 유지
    const newLength = scenarios.length - 1;
    setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
    setActiveIndex((i) => Math.min(i, newLength - 1));
  };

  const renameScenario = (scenarioId, name) => {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, name } : s)));
  };

  const setScenarioSemester = (scenarioId, semester) => {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, semester } : s)));
  };

  const toggleScenarioCourse = (scenarioId, courseId) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              courseIds: s.courseIds.includes(courseId)
                ? s.courseIds.filter((id) => id !== courseId)
                : [...s.courseIds, courseId],
            }
          : s
      )
    );
  };

  const getScenarioCourses = (scenario) =>
    basketCourses.filter((c) => scenario.courseIds.includes(c.id));

  const getScenarioSubtotal = (scenario) => {
    const courses = getScenarioCourses(scenario);
    return {
      total: courses.reduce((sum, c) => sum + c.credits, 0),
      major: courses.filter(isMajorCourse).reduce((sum, c) => sum + c.credits, 0),
      general: courses.filter(isGeneralCourse).reduce((sum, c) => sum + c.credits, 0),
    };
  };

  const handlePrev = () => {
    setActiveIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    if (activeIndex === scenarios.length) {
      // 추가 카드가 이미 가운데에 와 있는 상태 → 여기서 한 번 더 누르면 실제로 생성
      handleAddScenario();
    } else {
      setActiveIndex((i) => i + 1);
    }
  };

  const renderSlot = (index, active) => {
    if (index === scenarios.length) {
      return (
        <button
          key="add-card"
          type="button"
          className={`scenario-add-card ${active ? 'active' : 'dimmed'}`}
          onClick={handleAddScenario}
          aria-label="계획안 추가"
        >
          +
        </button>
      );
    }

    const scenario = scenarios[index];
    return (
      <ScenarioCard
        key={scenario.id}
        scenario={scenario}
        active={active}
        onFocus={() => setActiveIndex(index)}
        courses={getScenarioCourses(scenario)}
        subtotal={getScenarioSubtotal(scenario)}
        needed={needed}
        canDelete={scenarios.length > 1}
        onDelete={() => deleteScenario(scenario.id)}
        onRename={(name) => renameScenario(scenario.id, name)}
        onSemesterChange={(semester) => setScenarioSemester(scenario.id, semester)}
        onOpenCourseModal={() => setCourseModalScenarioId(scenario.id)}
      />
    );
  };

  const totalSlots = scenarios.length + 1; // 시나리오 + 추가 카드 자리
  const prevIndex = activeIndex > 0 ? activeIndex - 1 : null;
  const nextIndex = activeIndex < totalSlots - 1 ? activeIndex + 1 : null;

  const courseModalScenario = scenarios.find((s) => s.id === courseModalScenarioId) ?? null;

  return (
    <div className="sim-page">
      <div className="section-title">
        <h2>4학년 2학기까지, 어떻게 들어야 할까요?</h2>
      </div>

      <div className="sim-input-row">
        <select
          value={currentSemester}
          onChange={(e) => setCurrentSemester(e.target.value)}
        >
          {SEMESTERS.map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </select>
        <button type="button" className="cta" onClick={handleCalculate}>
          계산하기
        </button>
      </div>

      {!result && <p className="sub">학기를 선택하고 계산하기를 눌러주세요</p>}

      {result?.error && <p className="sim-warning">{result.error}</p>}

      {result && !result.error && (
        <div className="card">
          <div className="section-title">
            <h2>학기당 최소 이수 학점</h2>
            <span>남은 {result.remainingSemesters}학기</span>
          </div>

          <div className="req-row">
            <div className="req-name">총학점</div>
            <div className="req-pct">{result.perSemester.total.needed}학점</div>
          </div>
          <div className="req-row">
            <div className="req-name">전공</div>
            <div className="req-pct">{result.perSemester.major.needed}학점</div>
          </div>
          <div className="req-row">
            <div className="req-name">교양</div>
            <div className="req-pct">{result.perSemester.general.needed}학점</div>
          </div>

          {result.perSemester.total.warning && (
            <p className="sim-warning">
              학기당 {result.perSemester.total.needed}학점은 일반적인 수강신청 가능 학점(21학점)을 초과해요. 계획을 조정해보세요.
            </p>
          )}
        </div>
      )}

      <div className="section-title" style={{ marginTop: '32px' }}>
        <h2>계획안</h2>
        <span>여러 학기 계획을 시나리오로 비교해보세요</span>
      </div>

      <div className="scenario-carousel">
        <button
          type="button"
          className="carousel-arrow"
          onClick={handlePrev}
          disabled={activeIndex === 0}
          aria-label="이전 계획안"
        >
          ‹
        </button>

        {prevIndex !== null && renderSlot(prevIndex, false)}
        {renderSlot(activeIndex, true)}
        {nextIndex !== null && renderSlot(nextIndex, false)}

        <button
          type="button"
          className="carousel-arrow"
          onClick={handleNext}
          aria-label="다음 계획안"
        >
          ›
        </button>
      </div>

      {courseModalScenario && (
        <div className="req-modal-overlay" onClick={() => setCourseModalScenarioId(null)}>
          <div
            className="req-modal scenario-course-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="req-modal-close"
              onClick={() => setCourseModalScenarioId(null)}
              aria-label="닫기"
            >
              ✕
            </button>
            <h2 className="req-modal-title">{courseModalScenario.name}에 담을 과목을 선택해주세요</h2>
            <p className="req-modal-sub">과목을 클릭하면 담기/빼기가 바로 반영돼요.</p>

            <CourseBasketSection
              courses={basketCourses}
              selectedIds={courseModalScenario.courseIds}
              onToggle={(courseId) => toggleScenarioCourse(courseModalScenario.id, courseId)}
            />

            <button
              type="button"
              className="cta req-modal-submit"
              onClick={() => setCourseModalScenarioId(null)}
            >
              완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimulationPage;
