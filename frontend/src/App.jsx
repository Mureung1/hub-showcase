import { useEffect, useRef, useState } from "react";
import SubjectInputPage from "./components/SubjectInputPage";
import ResultScreen from "./components/ResultScreen";
import { WEIGHT_PRESETS, DEFAULT_WEIGHT_KEY } from "./utils/priorityCalculator";
import { fetchPriorityScores, scoreSubjectsLocally } from "./utils/priorityApi";
import {
  fetchSubjects,
  createSubject,
  updateSubject as updateSubjectOnServer,
  deleteSubject as deleteSubjectOnServer,
} from "./utils/subjectsApi";
import "./App.css";

const SUBJECTS_STORAGE_KEY = "exam-priority:subjects";
const WEIGHT_STORAGE_KEY = "exam-priority:weight";

function loadSubjects() {
  try {
    const raw = localStorage.getItem(SUBJECTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadWeightKey() {
  const saved = localStorage.getItem(WEIGHT_STORAGE_KEY);
  return saved && WEIGHT_PRESETS[saved] ? saved : DEFAULT_WEIGHT_KEY;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState("input");
  const [subjects, setSubjects] = useState(loadSubjects);
  const [weightKey, setWeightKey] = useState(loadWeightKey);
  // 우선순위 점수는 서버에서 계산해 받는다. 초기값과 폴백은 로컬 계산을 쓴다.
  const [scoredSubjects, setScoredSubjects] = useState(() =>
    scoreSubjectsLocally(subjects, weightKey)
  );
  const nextIdRef = useRef(
    subjects.reduce((max, subject) => Math.max(max, subject.id), 0) + 1
  );
  // 마운트 시점의 localStorage 과목. 서버 DB가 비어 있을 때 1회 이관에 쓴다.
  const initialSubjectsRef = useRef(subjects);

  // 서버가 로컬 id 이상을 발급하지 않도록, 서버에서 받은 과목 기준으로 다음 id를 맞춘다.
  function bumpNextId(list) {
    const maxId = list.reduce((max, subject) => Math.max(max, subject.id), 0);
    nextIdRef.current = Math.max(nextIdRef.current, maxId + 1);
  }

  useEffect(() => {
    localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(subjects));
  }, [subjects]);

  // 마운트 시 서버(DB)에서 과목을 불러온다. 서버가 응답하지 않으면 localStorage 초기값을 유지한다.
  useEffect(() => {
    let ignore = false;

    async function loadFromServer() {
      const result = await fetchSubjects();
      if (ignore || !result.ok) {
        return;
      }

      const cached = initialSubjectsRef.current;
      // 서버 DB가 비었고 로컬 캐시에 과목이 있으면 한 번만 DB로 이관한다.
      if (result.subjects.length === 0 && cached.length > 0) {
        const migrated = [];
        for (const subject of cached) {
          const created = await createSubject({
            name: subject.name,
            examDate: subject.examDate,
            understanding: subject.understanding,
            difficulty: subject.difficulty,
          });
          migrated.push(created.ok ? created.subject : subject);
        }
        if (!ignore) {
          bumpNextId(migrated);
          setSubjects(migrated);
        }
        return;
      }

      bumpNextId(result.subjects);
      setSubjects(result.subjects);
    }

    loadFromServer();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(WEIGHT_STORAGE_KEY, weightKey);
  }, [weightKey]);

  // 과목이나 성향이 바뀌면 즉시 로컬 계산으로 채우고, 서버 응답이 오면 교체한다.
  useEffect(() => {
    let ignore = false;

    setScoredSubjects(scoreSubjectsLocally(subjects, weightKey));

    fetchPriorityScores(subjects, weightKey).then((result) => {
      if (!ignore) {
        setScoredSubjects(result.subjects);
      }
    });

    return () => {
      ignore = true;
    };
  }, [subjects, weightKey]);

  async function handleAddSubject(subjectInput) {
    const result = await createSubject(subjectInput);

    if (result.ok) {
      bumpNextId([result.subject]);
      setSubjects((prev) => [...prev, result.subject]);
      return;
    }

    // 서버가 없으면 로컬 id로 추가한다. (정적 배포·서버 다운 폴백)
    const newSubject = { id: nextIdRef.current, ...subjectInput };
    nextIdRef.current += 1;
    setSubjects((prev) => [...prev, newSubject]);
  }

  async function handleUpdateSubject(id, subjectInput) {
    const result = await updateSubjectOnServer(id, subjectInput);
    const updated = result.ok ? result.subject : null;

    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === id ? updated ?? { ...subject, ...subjectInput } : subject
      )
    );
  }

  async function handleRemoveSubject(id) {
    // 서버 삭제 성공이든(DB 반영) 실패든(오프라인) UI 목록에서는 제거한다.
    await deleteSubjectOnServer(id);
    setSubjects((prev) => prev.filter((subject) => subject.id !== id));
  }

  return (
    <main className="app-container">
      <header className="app-header">
        <h1 className="app-title">오늘 뭐부터 공부하지?</h1>
        <p className="app-description">
          과목 정보를 입력하면 오늘 먼저 공부할 과목을 알려드려요.
        </p>
      </header>

      {currentScreen === "input" ? (
        <SubjectInputPage
          subjects={subjects}
          onAddSubject={handleAddSubject}
          onUpdateSubject={handleUpdateSubject}
          onRemoveSubject={handleRemoveSubject}
          onShowResult={() => setCurrentScreen("result")}
        />
      ) : (
        <ResultScreen
          subjects={scoredSubjects}
          weightKey={weightKey}
          onChangeWeight={setWeightKey}
          onBack={() => setCurrentScreen("input")}
        />
      )}
    </main>
  );
}

export default App;
