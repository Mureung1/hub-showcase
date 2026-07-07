import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  PenLine,
  RotateCcw,
  Sparkle,
  XCircle,
} from "lucide-react";
import "./styles.css";

const quests = {
  first: {
    title: "DB 개념 15분 공부",
    type: "시간형",
    detail: "정보처리기사 필기 · 데이터베이스",
    reward: 20,
    limit: "오늘 23:59",
  },
  recovery: {
    title: "DB 핵심 단어 5개 읽기",
    type: "복구",
    detail: "실패 기록을 바탕으로 줄인 재도전",
    reward: 5,
    limit: "잠들기 전",
  },
};

const weeklyPlan = [
  ["월", "DB 개념 15분", "done"],
  ["화", "기출 5문제", "active"],
  ["수", "오답 3개 정리", "wait"],
  ["목", "운영체제 15분", "wait"],
  ["금", "복습 노트", "wait"],
];

function PixelManager({ mood }) {
  return (
    <div className={`manager-sprite ${mood}`} aria-label="전자 생물 매니저 루미">
      <span className="ear left" />
      <span className="ear right" />
      <span className="head" />
      <span className="face">
        <i />
        <i />
        <b />
      </span>
      <span className="body" />
      <span className="shadow" />
    </div>
  );
}

function RoomScene({ mood, line }) {
  return (
    <section className="room-scene">
      <div className="wall left-wall" />
      <div className="wall right-wall" />
      <div className="floor" />
      <div className="window">
        <span />
        <span />
      </div>
      <div className="shelf">
        <span className="book red" />
        <span className="book blue" />
        <span className="book green" />
        <span className="bottle" />
      </div>
      <div className="desk">
        <span className="notebook" />
        <span className="plant" />
        <span className="mug" />
      </div>
      <div className="sofa">
        <span className="pillow" />
      </div>
      <div className="rug" />
      <div className="floor-note">Quest</div>
      <PixelManager mood={mood} />
      <div className="speech">
        <strong>루미</strong>
        <p>{line}</p>
      </div>
    </section>
  );
}

function QuestPanel({ quest, state, onAccept, onComplete, onFail, onReset }) {
  const accepted = state === "accepted";
  const done = state === "done";
  const failed = state === "failed";

  return (
    <section className="paper-panel quest-panel">
      <div className="panel-heading">
        <span>오늘의 퀘스트</span>
        <em>{state === "draft" ? "수락 전 수정 가능" : "진행 기록"}</em>
      </div>
      <h2>{quest.title}</h2>
      <p>{quest.detail}</p>

      <div className="stamp-row">
        <span>{quest.type}</span>
        <span>EXP +{quest.reward}</span>
        <span>{quest.limit}</span>
      </div>

      <div className="quest-timer">
        <Clock3 size={17} />
        <strong>{accepted ? "04:21:33 남음" : done ? "완료 기록 저장" : failed ? "소멸됨" : "수락 대기"}</strong>
      </div>

      <div className="button-row">
        {state === "draft" && (
          <>
            <button className="ghost" type="button">
              <PenLine size={16} />
              수정
            </button>
            <button className="solid" type="button" onClick={onAccept}>
              <Sparkle size={16} />
              수락
            </button>
          </>
        )}
        {accepted && (
          <>
            <button className="solid" type="button" onClick={onComplete}>
              <CheckCircle2 size={16} />
              완료
            </button>
            <button className="warn" type="button" onClick={onFail}>
              <XCircle size={16} />
              실패
            </button>
          </>
        )}
        {(done || failed) && (
          <button className="ghost" type="button" onClick={onReset}>
            <RotateCcw size={16} />
            다음 퀘스트
          </button>
        )}
      </div>
    </section>
  );
}

function ManagerPanel({ level, exp, state }) {
  const width = `${Math.min(100, exp)}%`;

  return (
    <section className="paper-panel manager-panel">
      <div className="panel-heading">
        <span>전자 생물 매니저</span>
        <em>페이스메이커</em>
      </div>
      <div className="manager-row">
        <div>
          <strong>루미 LV.{level}</strong>
          <p>{state === "failed" ? "성장 정체 · 다음 성공을 기다림" : "대기 중 · 작은 성공을 기록함"}</p>
        </div>
        <div className="mini-orb" />
      </div>
      <div className="xp">
        <span style={{ width }} />
      </div>
      <small>EXP {exp} / 100</small>
    </section>
  );
}

function WeeklyBoard() {
  return (
    <section className="paper-panel weekly-panel">
      <div className="panel-heading">
        <span>이번 주 목표</span>
        <em>정보처리기사 취득</em>
      </div>
      <ul>
        {weeklyPlan.map(([day, text, status]) => (
          <li className={status} key={day}>
            <b>{day}</b>
            <span>{text}</span>
            <em>{status === "done" ? "완료" : status === "active" ? "오늘" : "대기"}</em>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecoveryPanel({ visible }) {
  if (!visible) return null;

  return (
    <section className="paper-panel recovery-panel">
      <div className="panel-heading">
        <span>복구 퀘스트</span>
        <em>리밸런싱</em>
      </div>
      <p>실패는 기록으로 남기고, 다음 시도는 더 작은 크기로 줄였어.</p>
      <div className="reason-list">
        <button type="button">시간이 부족했다</button>
        <button type="button">목표가 너무 컸다</button>
        <button type="button">집중이 안 됐다</button>
      </div>
    </section>
  );
}

export default function App() {
  const [quest, setQuest] = useState(quests.first);
  const [state, setState] = useState("draft");
  const [exp, setExp] = useState(35);
  const [level, setLevel] = useState(1);

  const mood = useMemo(() => {
    if (state === "done") return "happy";
    if (state === "failed") return "still";
    if (state === "accepted") return "focus";
    return "wait";
  }, [state]);

  const line = useMemo(() => {
    if (state === "done") return "좋아. 작은 성공이 방 안에 불을 하나 켰어.";
    if (state === "failed") return "사라진 퀘스트도 기록이야. 이번엔 더 작게 다시 잡자.";
    if (state === "accepted") return "나는 여기서 기다릴게. 네 속도로 끝내고 돌아와.";
    return "기다리고 있었어. 오늘 할 수 있는 크기로 목표를 나눠봤어.";
  }, [state]);

  function acceptQuest() {
    setState("accepted");
  }

  function completeQuest() {
    setState("done");
    setExp((current) => {
      const next = current + quest.reward;
      if (next >= 100) {
        setLevel((value) => value + 1);
        return next - 100;
      }
      return next;
    });
  }

  function failQuest() {
    setState("failed");
    setQuest(quests.recovery);
  }

  function resetQuest() {
    setState("draft");
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>나를 믿는 너를 믿어</h1>
          <p>목표를 오늘의 퀘스트로 바꾸는 전자 생물 매니저</p>
        </div>
        <span>cozy pixel prototype</span>
      </header>

      <div className="layout">
        <RoomScene mood={mood} line={line} />

        <aside className="ui-stack">
          <QuestPanel
            quest={quest}
            state={state}
            onAccept={acceptQuest}
            onComplete={completeQuest}
            onFail={failQuest}
            onReset={resetQuest}
          />
          <ManagerPanel level={level} exp={exp} state={state} />
          <WeeklyBoard />
          <RecoveryPanel visible={state === "failed"} />
        </aside>
      </div>
    </main>
  );
}
