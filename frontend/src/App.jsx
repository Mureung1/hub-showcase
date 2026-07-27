import { useEffect, useRef, useState } from "react";
import ProgressSteps from "./components/ProgressSteps";
import CollectStep from "./components/CollectStep";
import UnderstandingStep from "./components/UnderstandingStep";
import ResultScreen from "./components/ResultScreen";
import { WEIGHT_PRESETS, DEFAULT_WEIGHT_KEY } from "./utils/priorityCalculator";
import { fetchPriorityScores, scoreSubjectsLocally } from "./utils/priorityApi";
import { UNKNOWN } from "./utils/scaleLabels";
import {
  fetchSubjects,
  createSubject,
  updateSubject as updateSubjectOnServer,
  completeSubject as completeSubjectOnServer,
  deleteSubject as deleteSubjectOnServer,
} from "./utils/subjectsApi";
import { isCompleted } from "./utils/subjectStatus";
import "./App.css";

const SUBJECTS_STORAGE_KEY = "exam-priority:subjects";
const WEIGHT_STORAGE_KEY = "exam-priority:weight";

// 1단계에서는 이름과 시험 날짜만 받는다. 나머지는 "아직 안 물어봤다"는 뜻의 모름으로 둔다.
// 여기에 중립값 4를 넣으면, 사용자가 답한 적 없는 값이 점수에 섞인다. (priorityCalculator.js 참고)
const NEW_SUBJECT_DEFAULTS = {
  understanding: UNKNOWN,
  difficulty: UNKNOWN,
  grading: UNKNOWN,
  studyAmount: UNKNOWN,
  availableTime: UNKNOWN,
  // 학점 수는 점수를 곱하는 배수라 3학점(1배)이 중립이다. 안 물어봐도 순위를 왜곡하지 않는다.
  credits: 3,
  gradeWeight: null,
  previousScore: null,
};

// 서버로 보낼 때 쓰는 필드 목록. 부분 수정이라도 서버는 전체 값을 받으므로 합쳐서 보낸다.
function toServerPayload(subject) {
  return {
    name: subject.name,
    examDate: subject.examDate,
    understanding: subject.understanding,
    difficulty: subject.difficulty,
    gradeWeight: subject.gradeWeight,
    grading: subject.grading,
    studyAmount: subject.studyAmount,
    availableTime: subject.availableTime,
    credits: subject.credits,
    previousScore: subject.previousScore,
  };
}

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
  // collect(과목 담기) -> understanding(이해도) -> result(결과)
  const [step, setStep] = useState("collect");
  const [subjects, setSubjects] = useState(loadSubjects);
  const [weightKey, setWeightKey] = useState(loadWeightKey);
  // 완료 과목은 활성 목록·우선순위 계산 어디에도 노출하지 않는다.
  const activeSubjects = subjects.filter((subject) => !isCompleted(subject));

  // 우선순위 점수는 서버에서 계산해 받고, 서버가 없으면 로컬 계산으로 대체한다.
  // 로컬 계산은 렌더 중에 바로 구한다. effect 안에서 setState 로 채우면 렌더가 두 번 돈다.
  const locallyScored = scoreSubjectsLocally(activeSubjects, weightKey);
  // 서버 응답은 "어떤 입력에 대한 답인지"를 같이 들고 있어야, 과목을 바꾼 직후
  // 이전 입력에 대한 점수가 잠깐 보이는 일이 없다.
  const scoreSignature = `${weightKey}|${JSON.stringify(activeSubjects)}`;
  const [serverScores, setServerScores] = useState(null);
  const scoredSubjects =
    serverScores?.signature === scoreSignature ? serverScores.subjects : locallyScored;
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
          // 일부 필드만 보내면 나머지가 서버에서 비워진다. 전체를 그대로 옮긴다.
          const created = await createSubject(toServerPayload(subject));
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

  // 과목이나 성향이 바뀌면 서버에 다시 물어본다. 답이 오기 전까지는 로컬 계산이 보인다.
  useEffect(() => {
    let ignore = false;

    fetchPriorityScores(activeSubjects, weightKey).then((result) => {
      if (!ignore) {
        setServerScores({ signature: scoreSignature, subjects: result.subjects });
      }
    });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreSignature]);

  async function handleAddSubject({ name, examDate }) {
    const subjectInput = { ...NEW_SUBJECT_DEFAULTS, name, examDate };
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

  // patch 는 바뀐 필드만 담는다. 화면에는 곧바로 반영하고 서버에는 합친 전체를 보낸다.
  async function handleUpdateSubject(id, patch) {
    const current = subjects.find((subject) => subject.id === id);
    if (!current) {
      return;
    }

    const merged = { ...current, ...patch };
    setSubjects((prev) =>
      prev.map((subject) => (subject.id === id ? merged : subject))
    );

    const result = await updateSubjectOnServer(id, toServerPayload(merged));
    if (result.ok) {
      setSubjects((prev) =>
        prev.map((subject) => (subject.id === id ? result.subject : subject))
      );
    }
  }

  async function handleRemoveSubject(id) {
    // 서버 삭제 성공이든(DB 반영) 실패든(오프라인) UI 목록에서는 제거한다.
    await deleteSubjectOnServer(id);
    setSubjects((prev) => prev.filter((subject) => subject.id !== id));
  }

  async function handleCompleteSubject(id) {
    const result = await completeSubjectOnServer(id);

    if (result.ok) {
      setSubjects((prev) =>
        prev.map((subject) => (subject.id === id ? result.subject : subject))
      );
      return;
    }

    // 서버가 없으면 로컬에서 completedAt을 채운다. (정적 배포·서버 다운 폴백)
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === id
          ? { ...subject, completedAt: new Date().toISOString() }
          : subject
      )
    );
  }

  return (
    <main className="app-container">
      <header className="app-header">
        <h1 className="app-title">오늘 뭐부터 공부하지?</h1>
        <p className="app-description">
          과목 정보를 입력하면 오늘 먼저 공부할 과목을 알려드려요.
        </p>
      </header>

      <ProgressSteps current={step} />

      {step === "collect" && (
        <CollectStep
          subjects={scoredSubjects}
          onAddSubject={handleAddSubject}
          onRemoveSubject={handleRemoveSubject}
          onNext={() => setStep("understanding")}
        />
      )}

      {step === "understanding" && (
        <UnderstandingStep
          subjects={scoredSubjects}
          onChangeUnderstanding={(id, value) =>
            handleUpdateSubject(id, { understanding: value })
          }
          onUpdateSubject={handleUpdateSubject}
          onBack={() => setStep("collect")}
          onNext={() => setStep("result")}
        />
      )}

      {step === "result" && (
        <ResultScreen
          subjects={scoredSubjects}
          weightKey={weightKey}
          onChangeWeight={setWeightKey}
          onUpdateSubject={handleUpdateSubject}
          onCompleteSubject={handleCompleteSubject}
          onBack={() => setStep("collect")}
        />
      )}
    </main>
  );
}

export default App;
