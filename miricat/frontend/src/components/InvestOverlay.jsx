import { useEffect, useRef, useState } from "react";
import Miricat from "./Miricat";

// 등록 직후 "미리캣이 확인하는 중" 연출.
// 프로토타입(miricat-app.html)의 runInvest를 React로 옮긴 것 — 실제 첫 점검(POST)이
// 도는 동안 5단계를 계단식으로 보여주고, check 결과가 오면 마지막에 판정을 공개한다.
// 연출은 겉껍데기일 뿐, 판정 내용(경보/이상없음/관할밖)은 서버의 진짜 결과를 그대로 쓴다.

const STAGES = [
  { key: "plan",   name: "살펴볼 곳 정하기", role: "내 경로가 지나는 지역·노선 확인" },
  { key: "scout",  name: "게시판 둘러보기", role: "전국 교통 게시판을 대신 확인" },
  { key: "verify", name: "내용 다시 확인", role: "찾은 내용을 원문과 대조" },
  { key: "match",  name: "내 경로와 맞춰보기", role: "노선·정류장·도로·반경으로 판정" },
  { key: "report", name: "결과 알려주기", role: "쉬운 말로 정리해 전달" },
];

const BOARDS = [
  "서울 TOPIS", "인천", "경기 GBIS", "대전", "세종", "대구",
  "울산", "광주", "부산", "창원", "전주", "제주", "국가 도로돌발",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function InvestOverlay({ check, onDone }) {
  const [active, setActive] = useState(-1);        // 진행 중 단계 index
  const [done, setDone] = useState(-1);            // 완료된 단계 index (이하 전부 완료)
  const [board, setBoard] = useState(-1);          // 확인 중인 게시판 index
  const [verdict, setVerdict] = useState(null);    // 최종 공개 (연출 끝 + check 도착 후)
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    run();
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    // 1. 살펴볼 곳
    setActive(0); await sleep(650); if (!alive.current) return; setDone(0);
    // 2. 게시판 순차 확인
    setActive(1);
    for (let i = 0; i < BOARDS.length; i++) {
      setBoard(i); await sleep(120); if (!alive.current) return;
    }
    setBoard(-1); setDone(1);
    // 3. 다시 확인 (검증 루프)
    setActive(2); await sleep(700); if (!alive.current) return; setDone(2);
    // 4. 매칭
    setActive(3); await sleep(750); if (!alive.current) return; setDone(3);
    // 5. 정리
    setActive(4); await sleep(600); if (!alive.current) return; setDone(4);
    setActive(-1);
    // 연출이 끝났으니 실제 판정 공개 (check는 이미 도착해 있음)
    setVerdict(verdictOf(check));
  }

  const skip = () => { alive.current = false; setVerdict(verdictOf(check)); };

  return (
    <div className="invest-overlay">
      <div className="invest-head">
        <Miricat size={44} />
        <div>
          <div className="invest-title">🐾 미리캣이 확인하고 있어요</div>
          <div className="invest-sub">보초를 세우자마자 모아둔 공지와 대조하는 중</div>
        </div>
      </div>

      <div className="invest-stages">
        {STAGES.map((s, i) => {
          const state = i <= done ? "done" : i === active ? "run" : "wait";
          return (
            <div key={s.key} className={`invest-stage ${state}`}>
              <span className="invest-dot">{state === "done" ? "✓" : i + 1}</span>
              <div className="invest-info">
                <div className="invest-name">
                  {s.name}
                  <span className="invest-state">
                    {state === "done" ? "완료" : state === "run" ? "확인 중" : "대기"}
                  </span>
                </div>
                <div className="invest-role">{s.role}</div>
                {s.key === "scout" && active === 1 && (
                  <div className="invest-boards">
                    {BOARDS.map((b, bi) => (
                      <span key={b} className={`invest-board ${bi < board ? "chk" : bi === board ? "cur" : ""}`}>{b}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {verdict ? (
        <div className={`invest-verdict ${verdict.cls}`}>
          <div className="invest-verdict-t">{verdict.icon} {verdict.title}</div>
          <div className="invest-verdict-s">{verdict.sub}</div>
          <button className="btn-primary" onClick={() => onDone?.()}>확인</button>
        </div>
      ) : (
        <button className="invest-skip" onClick={skip}>바로 결과 보기 →</button>
      )}
    </div>
  );
}

// 서버 첫 점검 결과(check)를 화면 판정으로 — RouteRegister의 3분기와 같은 규칙.
function verdictOf(check) {
  if (check?.alertCount > 0) {
    return {
      cls: "alarm", icon: "🚨", title: "지금 영향 주는 공지를 찾았어요",
      sub: check.notified ? "디스코드로 첫 경보를 보냈어요!" : "아래 목록에서 확인하세요.",
    };
  }
  if (check && check.alertCount === 0 && check.covered) {
    return {
      cls: "clear", icon: "🔎", title: `공지 ${check.checked}건과 대조 — 영향 없음`,
      sub: check.notified ? "디스코드로 첫 보고를 보냈어요." : "오늘은 이상 없어요.",
    };
  }
  return {
    cls: "out", icon: "📍", title: "도로 돌발상황은 전국을 확인해요",
    sub: "다만 이 지역 버스 게시판은 아직 감시 전이에요.",
  };
}
