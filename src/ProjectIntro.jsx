import { useState } from "react";
import "./ProjectIntro.css";

// 소개용 샘플 데이터 (실제 수집 기능이 아니라, 아이디어를 보여주기 위한 목업)
const SAMPLE = [
  { name: "링커리어 대외활동", tags: ["대외활동"] },
  { name: "콘테스트코리아 공모전", tags: ["공모전"] },
  { name: "OO시 청년정책 사업", tags: ["지자체"] },
  { name: "△△장학재단 장학금", tags: ["장학"] },
  { name: "지역아동센터 봉사", tags: ["봉사"] },
  { name: "전공연계 학회 지원", tags: ["대외활동", "장학"] },
];

const CONDITIONS = ["대외활동", "공모전", "지자체", "장학", "봉사"];

export default function ProjectIntro() {
  // 선택한 "내 조건" — 핵심: 조건에 해당되는 것만 총망라해서 보여준다
  const [selected, setSelected] = useState(["대외활동", "장학"]);

  const toggle = (c) =>
    setSelected((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  // 선택 조건 중 하나라도 걸리면 노출
  const matched = SAMPLE.filter((item) =>
    item.tags.some((t) => selected.includes(t))
  );

  return (
    <main className="intro">
      <header className="intro__header">
        <p className="intro__eyebrow">Connect AI Agent Challenge · N186_이재호</p>
        <h1 className="intro__resolve">AI Agent 사용을 익히겠다 💪</h1>
      </header>

      <section className="intro__project">
        <h2>흩어진 대외활동, 내 조건에 딱 맞는 것만</h2>
        <p className="intro__problem">
          링커리어·콘테스트코리아·지자체 사업·장학재단·봉사… 대학생 대외활동 정보는
          <strong> 너무 여러 곳에 흩어져</strong> 있어 자기한테 맞는 걸 놓치기 쉽습니다.
          (Perplexity로 찾아도 상당수를 놓치더군요.)
        </p>
        <p className="intro__solution">
          <strong>내 조건을 정확히 체크</strong>하면 → 나에게 해당되는 활동만
          <strong> 빠짐없이 총망라</strong>해서 보여주는 서비스를 만들려 합니다.
          핵심은 <strong>확실한 수집·서칭</strong>입니다.
        </p>
      </section>

      <section className="intro__demo">
        <p className="intro__demo-label">내 조건 (클릭해서 선택)</p>
        <div className="intro__chips">
          {CONDITIONS.map((c) => (
            <button
              key={c}
              className={`chip ${selected.includes(c) ? "chip--on" : ""}`}
              onClick={() => toggle(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="intro__demo-label">나에게 해당되는 활동 ({matched.length})</p>
        <ul className="intro__results">
          {matched.map((item) => (
            <li key={item.name}>
              {item.name} <span>{item.tags.join(" · ")}</span>
            </li>
          ))}
          {matched.length === 0 && <li className="empty">조건을 선택해 주세요</li>}
        </ul>
      </section>
    </main>
  );
}
