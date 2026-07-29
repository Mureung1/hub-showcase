import { useCallback, useEffect, useRef, useState } from "react";
import ProgressSteps from "./components/ProgressSteps";
import CollectStep from "./components/CollectStep";
import UnderstandingStep from "./components/UnderstandingStep";
import ResultScreen from "./components/ResultScreen";
import ResultSummary from "./components/ResultSummary";
import DoneList from "./components/DoneList";
import Notice from "./components/Notice";
import { WEIGHT_PRESETS, DEFAULT_WEIGHT_KEY } from "./utils/priorityCalculator";
import { fetchPriorityScores, scoreSubjectsLocally } from "./utils/priorityApi";
import { SCALE_MIDDLE, UNKNOWN } from "./utils/scaleLabels";
import {
  fetchSubjects,
  createSubject,
  updateSubject as updateSubjectOnServer,
  completeSubject as completeSubjectOnServer,
  uncompleteSubject as uncompleteSubjectOnServer,
  deleteSubject as deleteSubjectOnServer,
} from "./utils/subjectsApi";
import { buildExampleSubjects } from "./utils/exampleSubjects";
import { isCompleted } from "./utils/subjectStatus";
import "./App.css";

// 단계를 주소(#해시)에 담는다. 이게 없으면 브라우저 뒤로가기가 앱을 통째로 나가버린다.
// 라우터 라이브러리를 새로 들이지 않으려고 해시만 쓴다.
const STEPS = ["collect", "understanding", "result", "done"];

function readStepFromUrl() {
  const fromHash = window.location.hash.replace("#", "");
  return STEPS.includes(fromHash) ? fromHash : "collect";
}

const SUBJECTS_STORAGE_KEY = "exam-priority:subjects";
const WEIGHT_STORAGE_KEY = "exam-priority:weight";
const PLAN_HOURS_STORAGE_KEY = "exam-priority:planHours";
// 저녁에 흔히 쓸 만한 시간. 화면에 그대로 보이고 바로 고칠 수 있어서 숨은 가정이 아니다.
const DEFAULT_PLAN_HOURS = "3";

// 1단계에서는 이름과 시험 날짜만 받는다.
//
// 이해도·공부 분량은 2단계에서 모든 과목에 대해 반드시 거치는 항목이라, 가운데(4=보통)에서
// 시작해 사용자가 좌우로 옮기게 한다. 빈 상태에서 고르게 하는 것보다 기준점이 있는 편이 빠르다.
// 나머지는 "아직 안 물어봤다"는 뜻의 모름으로 둔다. 여기에 중립값을 넣으면 사용자가 답한 적
// 없는 값이 점수에 섞인다. (priorityCalculator.js 참고)
const NEW_SUBJECT_DEFAULTS = {
  understanding: SCALE_MIDDLE,
  studyAmount: SCALE_MIDDLE,
  difficulty: UNKNOWN,
  grading: UNKNOWN,
  availableTime: UNKNOWN,
  credits: null,
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

function loadPlanHours() {
  return localStorage.getItem(PLAN_HOURS_STORAGE_KEY) ?? DEFAULT_PLAN_HOURS;
}

function App() {
  // collect(과목 담기) -> understanding(분량·이해도) -> result(결과), 그리고 done(완료 목록)
  const [step, setStep] = useState(readStepFromUrl);
  const [subjects, setSubjects] = useState(loadSubjects);
  const [weightKey, setWeightKey] = useState(loadWeightKey);
  const [planHours, setPlanHours] = useState(loadPlanHours);
  // 완료 과목은 활성 목록·우선순위 계산 어디에도 노출하지 않는다.
  const activeSubjects = subjects.filter((subject) => !isCompleted(subject));

  // 우선순위 점수는 서버에서 계산해 받고, 서버가 없으면 로컬 계산으로 대체한다.
  // 로컬 계산은 렌더 중에 바로 구한다. effect 안에서 setState 로 채우면 렌더가 두 번 돈다.
  const locallyScored = scoreSubjectsLocally(activeSubjects, weightKey);
  // 서버 응답은 "어떤 입력에 대한 답인지"를 같이 들고 있어야, 과목을 바꾼 직후
  // 이전 입력에 대한 점수가 잠깐 보이는 일이 없다.
  const scoreSignature = `${weightKey}|${JSON.stringify(activeSubjects)}`;
  const [serverScores, setServerScores] = useState(null);
  // 서버가 응답하지 않아 localStorage 로만 도는 상태인지. 화면에 알려주는 용도다.
  const [isServerDown, setIsServerDown] = useState(false);
  // 무료 플랜 서버는 잠들었다 깨는 데 50초쯤 걸린다. 그동안 아무 표시가 없으면 고장으로 보인다.
  const [isWakingServer, setIsWakingServer] = useState(false);
  // 방금 한 일을 알리고 되돌릴 기회를 주는 알림. { message, onUndo? }
  const [notice, setNotice] = useState(null);

  const closeNotice = useCallback(() => setNotice(null), []);
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

    // 2초 안에 답이 오면 굳이 알리지 않는다. 그보다 오래 걸릴 때만 깨우는 중이라고 말한다.
    const wakingTimer = setTimeout(() => setIsWakingServer(true), 2000);

    async function loadFromServer() {
      const result = await fetchSubjects();
      clearTimeout(wakingTimer);
      if (ignore) {
        return;
      }
      setIsWakingServer(false);

      // 서버가 없으면 localStorage 로 계속 쓸 수 있지만, 그걸 화면에 알리지 않으면
      // 사용자는 저장된 줄 안다. 어디에 저장되고 있는지는 말해줘야 한다.
      setIsServerDown(!result.ok);
      if (!result.ok) {
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
      clearTimeout(wakingTimer);
    };
  }, []);

  // 단계가 바뀌면 주소에 남기고, 뒤로가기로 주소가 바뀌면 단계를 되돌린다.
  useEffect(() => {
    if (readStepFromUrl() !== step) {
      window.location.hash = step;
    }
  }, [step]);

  useEffect(() => {
    function handlePopState() {
      setStep(readStepFromUrl());
    }

    window.addEventListener("hashchange", handlePopState);
    return () => window.removeEventListener("hashchange", handlePopState);
  }, []);

  useEffect(() => {
    localStorage.setItem(WEIGHT_STORAGE_KEY, weightKey);
  }, [weightKey]);

  useEffect(() => {
    localStorage.setItem(PLAN_HOURS_STORAGE_KEY, planHours);
  }, [planHours]);

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

  // 한 과목을 담는다. 서버가 없으면 로컬 id로 추가한다. (정적 배포·서버 다운 폴백)
  async function addSubject(subjectInput) {
    const result = await createSubject(subjectInput);

    if (result.ok) {
      bumpNextId([result.subject]);
      setSubjects((prev) => [...prev, result.subject]);
      return result.subject;
    }

    const newSubject = { id: nextIdRef.current, ...subjectInput };
    nextIdRef.current += 1;
    setSubjects((prev) => [...prev, newSubject]);
    return newSubject;
  }

  async function handleAddSubject({ name, examDate }) {
    const added = await addSubject({ ...NEW_SUBJECT_DEFAULTS, name, examDate });

    // 담아도 아무 반응이 없으면 저장됐는지 알 수 없다. 무엇이 담겼는지 이름으로 알린다.
    setNotice({ message: `"${added.name}"을(를) 담았어요.` });
  }

  // 처음 온 사람이 무엇을 넣어야 할지 몰라 멈추지 않도록, 성격이 다른 예시 세 과목을 한 번에 담는다.
  async function handleFillExample() {
    const examples = buildExampleSubjects();
    for (const example of examples) {
      await addSubject(example);
    }

    setNotice({ message: `예시 과목 ${examples.length}개를 담았어요. 값을 고쳐가며 써보세요.` });
    setStep("understanding");
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
    const removed = subjects.find((subject) => subject.id === id);

    // 서버 삭제 성공이든(DB 반영) 실패든(오프라인) UI 목록에서는 제거한다.
    await deleteSubjectOnServer(id);
    setSubjects((prev) => prev.filter((subject) => subject.id !== id));

    if (!removed) {
      return;
    }

    // 지운 과목은 되살릴 때 새 id 를 받는다. 서버에서 이미 사라졌기 때문이다.
    setNotice({
      message: `"${removed.name}"을(를) 지웠어요.`,
      onUndo: () => {
        closeNotice();
        restoreSubject(removed);
      },
    });
  }

  // 지운 과목을 같은 내용으로 다시 담는다.
  // 서버에서 이미 사라졌으므로 id 는 빼고 보낸다. 되살아난 과목은 새 id 를 받는다.
  async function restoreSubject(subject) {
    const input = { ...subject };
    delete input.id;

    const result = await createSubject(input);

    if (result.ok) {
      bumpNextId([result.subject]);
      setSubjects((prev) => [...prev, result.subject]);
      return;
    }

    const restored = { ...input, id: nextIdRef.current };
    nextIdRef.current += 1;
    setSubjects((prev) => [...prev, restored]);
  }

  async function handleCompleteSubject(id) {
    const target = subjects.find((subject) => subject.id === id);
    const result = await completeSubjectOnServer(id);

    if (result.ok) {
      setSubjects((prev) =>
        prev.map((subject) => (subject.id === id ? result.subject : subject))
      );
    } else {
      // 서버가 없으면 로컬에서 completedAt을 채운다. (정적 배포·서버 다운 폴백)
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === id
            ? { ...subject, completedAt: new Date().toISOString() }
            : subject
        )
      );
    }

    setNotice({
      message: `"${target?.name ?? "과목"}" 공부를 끝냈어요.`,
      onUndo: () => {
        closeNotice();
        handleUncompleteSubject(id);
      },
    });
  }

  // 완료를 되돌린다. 되돌리기 버튼과 완료 목록 화면에서 함께 쓴다.
  async function handleUncompleteSubject(id) {
    const result = await uncompleteSubjectOnServer(id);

    if (result.ok) {
      setSubjects((prev) =>
        prev.map((subject) => (subject.id === id ? result.subject : subject))
      );
      return;
    }

    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === id ? { ...subject, completedAt: null } : subject
      )
    );
  }

  // 결과 단계에서는 왼쪽에 순위가 이미 다 나오므로 옆 순위판을 띄우지 않는다.
  // 넓은 화면에서만 옆에 붙고, 좁은 화면에서는 단계 흐름 그대로다. (App.css 참고)
  const showSummary = step !== "result" && step !== "done" && scoredSubjects.length > 0;

  // 좁은 화면에서는 옆 순위판이 감춰져서, 과목을 담아도 결과 화면까지 가야 뭐라도 보인다.
  // 순위판 전체를 좁은 화면에 밀어 넣는 대신(결과 화면과 겹친다) 1순위 한 줄만 보여준다.
  const topSubject = showSummary
    ? [...scoredSubjects].sort((a, b) => b.priorityScore - a.priorityScore)[0]
    : null;

  const doneSubjects = subjects.filter(isCompleted);

  return (
    <main className={`app-container${showSummary ? " has-side" : ""}`}>
      <header className="app-header">
        <h1 className="app-title">오늘 뭐부터 공부하지?</h1>
        <p className="app-description">
          과목 정보를 입력하면 오늘 먼저 공부할 과목을 알려드려요.
        </p>
      </header>

      {isWakingServer && (
        <p className="server-note" role="status">
          서버를 깨우는 중이에요. 처음 열 때는 1분 가까이 걸릴 수 있어요.
        </p>
      )}

      {isServerDown && (
        <p className="server-note" role="status">
          서버에 연결하지 못해 이 브라우저에만 저장하고 있어요. 다른 기기에서는 보이지 않아요.
        </p>
      )}

      {/* 완료 목록은 1·2·3 흐름 바깥의 곁가지다. 단계 표시를 그대로 두면
          어느 단계도 현재가 아니라 셋 다 회색으로 꺼져 보인다. */}
      {step !== "done" && <ProgressSteps current={step} />}

      {topSubject && (
        <p className="top-hint">
          지금 1순위는 <strong>{topSubject.name}</strong> ({topSubject.priorityScore}점)
        </p>
      )}

      <div className="app-layout">
        <div className="app-main">
          {step === "collect" && (
            <CollectStep
              subjects={scoredSubjects}
              onAddSubject={handleAddSubject}
              onRemoveSubject={handleRemoveSubject}
              onFillExample={handleFillExample}
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
              planHours={planHours}
              onChangePlanHours={setPlanHours}
              onUpdateSubject={handleUpdateSubject}
              onCompleteSubject={handleCompleteSubject}
              doneCount={doneSubjects.length}
              onOpenDone={() => setStep("done")}
              onBack={() => setStep("collect")}
            />
          )}

          {step === "done" && (
            <DoneList
              subjects={doneSubjects}
              onUncomplete={handleUncompleteSubject}
              onBack={() => setStep("result")}
            />
          )}
        </div>

        {showSummary && (
          <ResultSummary subjects={scoredSubjects} weightKey={weightKey} />
        )}
      </div>

      {notice && (
        <Notice
          message={notice.message}
          onUndo={notice.onUndo}
          onClose={closeNotice}
        />
      )}
    </main>
  );
}

export default App;
