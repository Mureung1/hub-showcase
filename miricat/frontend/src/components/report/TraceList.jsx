import { useState, useEffect } from "react";
import { SOURCE_LABEL, routeTokens, isCurrent } from "../../lib/matching";
import { withJosa } from "../../lib/josa";

// "미리캣이 이렇게 확인했어요" — 매칭 로직이 실제로 한 일만 문장으로 조립한다.
// (데이터에 없는 주장 금지. Langfuse 기반 실제 조사 기록 연동은 MIRI-27)
function buildSteps({ notice, currentRoute, hits, event }) {
  const tokens = routeTokens(currentRoute);
  const affected = hits.size > 0;
  const steps = [];

  steps.push(
    tokens.length > 0
      ? { text: `내 경로가 ${withJosa(tokens.join(" · "), "를", "을")} 지나는 걸 확인했어요` }
      : { text: "등록된 경로 정보가 없어 공지 내용만 확인했어요" }
  );
  steps.push({ text: `${SOURCE_LABEL[notice.source] ?? notice.source} 공지를 둘러봤어요` });
  steps.push(
    event
      ? { text: `공지에서 "${event.event_name}" 안내를 찾았어요`, found: true }
      : { text: "이 공지에서는 통제·우회 사건을 찾지 못했어요" }
  );
  if (event) {
    steps.push({ text: "찾은 내용을 다시 한 번 확인했어요" });   // 그래프의 검증 단계(재추출 루프)
  }
  if (event?.period) {
    steps.push(
      isCurrent(event.period)
        ? { text: `기간(${event.period})이 지금도 유효한지 확인했어요` }
        : { text: `기간(${event.period})을 확인했어요 — 이미 지난 일이에요` }
    );
  }
  if (tokens.length > 0 && event) {
    steps.push(
      affected
        ? { text: `내가 타는 ${withJosa([...hits].join(", "), "와", "과")} 겹쳐서 영향이 있어요`, found: true }
        : event.period && !isCurrent(event.period)
          ? { text: "끝난 일이라 경보에서 제외했어요", found: true }
          : { text: "겹치는 노선·정류장이 없어 영향 없음으로 확인했어요", found: true }
    );
  }
  return steps;
}

export default function TraceList({ notice, currentRoute, hits, event }) {
  const steps = buildSteps({ notice, currentRoute, hits, event });
  const [shown, setShown] = useState(0);   // 몇 번째 문장까지 켜졌나

  useEffect(() => {
    // 한 문장씩 200ms 간격으로 켜기 — cleanup에서 타이머 전부 해제 (StrictMode 이중 실행에도 안전)
    const timers = steps.map((_, i) => setTimeout(() => setShown(i + 1), 200 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [notice.id]);   // 다른 공지로 이동하면 처음부터 다시

  return (
    <div className="rp-block">
      <div className="rp-kicker">미리캣이 이렇게 확인했어요</div>
      <div className="trace">
        {steps.map((s, i) => (
          <div key={i} className={`trace-item${i < shown ? " show" : ""}${s.found ? " found" : ""}`}>
            {s.text}
          </div>
        ))}
      </div>
    </div>
  );
}
