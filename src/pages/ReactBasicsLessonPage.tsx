import { useEffect, useMemo, useState } from "react";
import styles from "./ReactBasicsLessonPage.module.css";

type LessonData = {
  title: string;
  summary: string;
  cards: Array<{
    title: string;
    description: string;
    tag: string;
  }>;
  fetchNotes: string[];
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: LessonData };

const starterNotes = [
  "컴포넌트를 화면 역할별로 나눈다.",
  "state는 화면의 현재값만 담당한다.",
  "fetch는 데이터 흐름을 분리해서 가져온다.",
];

function ReactBasicsLessonPage() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [notes, setNotes] = useState(starterNotes);
  const [draft, setDraft] = useState("");
  const [selectedCard, setSelectedCard] = useState(0);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoadState({ status: "loading" });
      try {
        const response = await fetch("/lesson-data.json", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`데이터를 불러오지 못했습니다. (${response.status})`);
        }
        const data = (await response.json()) as LessonData;
        if (!active) return;
        setLoadState({ status: "ready", data });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        });
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadCount]);

  const readyData = loadState.status === "ready" ? loadState.data : null;
  const activeCard = readyData?.cards[selectedCard] ?? null;

  const noteCount = useMemo(() => notes.length, [notes]);

  const addNote = () => {
    const next = draft.trim();
    if (!next) return;
    setNotes((current) => [next, ...current]);
    setDraft("");
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>오늘의 과제</p>
          <h1>React 핵심 화면 만들기</h1>
          <p>
            화면을 작은 컴포넌트로 나누고, <code>state</code>와 <code>fetch</code>를 직접 만져보는
            실습 페이지입니다.
          </p>
        </div>
        <div className={styles.heroStats} aria-label="과제 핵심 요약">
          <div>
            <span>컴포넌트</span>
            <strong>3개 이상</strong>
          </div>
          <div>
            <span>상태</span>
            <strong>{noteCount}개 메모</strong>
          </div>
          <div>
            <span>fetch</span>
            <strong>{loadState.status === "ready" ? "성공" : loadState.status}</strong>
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelLabel}>1. 컴포넌트</p>
            <h2>화면을 역할별로 분리</h2>
          </div>
          <div className={styles.cardStrip}>
            <button
              type="button"
              className={`${styles.lessonCard} ${selectedCard === 0 ? styles.lessonCardActive : ""}`}
              onClick={() => setSelectedCard(0)}
            >
              <span>헤더</span>
              <strong>무엇을 보여줄지 정한다</strong>
            </button>
            <button
              type="button"
              className={`${styles.lessonCard} ${selectedCard === 1 ? styles.lessonCardActive : ""}`}
              onClick={() => setSelectedCard(1)}
            >
              <span>상태</span>
              <strong>화면의 현재값을 저장한다</strong>
            </button>
            <button
              type="button"
              className={`${styles.lessonCard} ${selectedCard === 2 ? styles.lessonCardActive : ""}`}
              onClick={() => setSelectedCard(2)}
            >
              <span>fetch</span>
              <strong>외부 데이터를 가져온다</strong>
            </button>
          </div>
          {activeCard && (
            <div className={styles.focusCard}>
              <p>{activeCard.tag}</p>
              <h3>{activeCard.title}</h3>
              <p>{activeCard.description}</p>
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelLabel}>2. state</p>
            <h2>입력하고 추가하면 바로 보이는 메모</h2>
          </div>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="text"
              value={draft}
              placeholder="오늘 손코딩할 한 줄을 적어보세요"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addNote();
                }
              }}
            />
            <button className={styles.primaryButton} type="button" onClick={addNote}>
              메모 추가
            </button>
          </div>
          <ul className={styles.noteList} aria-label="실습 메모">
            {notes.map((note, index) => (
              <li key={`${note}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{note}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelLabel}>3. fetch</p>
            <h2>mock 데이터를 불러오는 흐름</h2>
          </div>
          <div className={styles.fetchBox}>
            {loadState.status === "loading" && <p>데이터를 불러오는 중입니다.</p>}
            {loadState.status === "error" && <p role="alert">{loadState.message}</p>}
            {loadState.status === "ready" && (
              <>
                <strong>{loadState.data.title}</strong>
                <p>{loadState.data.summary}</p>
                <ul className={styles.bulletList}>
                  {loadState.data.fetchNotes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setReloadCount((current) => current + 1)}
          >
            다시 불러오기
          </button>
        </article>
      </section>

      <section className={styles.footerPanel}>
        <div>
          <p className={styles.panelLabel}>손코딩 메모</p>
          <h2>오늘은 이렇게 타이핑하면 된다</h2>
        </div>
        <ol className={styles.steps}>
          <li>화면을 먼저 그린다.</li>
          <li>컴포넌트별 책임을 나눈다.</li>
          <li>state로 입력, 선택, 토글을 처리한다.</li>
          <li>fetch로 외부 데이터를 가져와 렌더링한다.</li>
        </ol>
      </section>
    </main>
  );
}

export default ReactBasicsLessonPage;
