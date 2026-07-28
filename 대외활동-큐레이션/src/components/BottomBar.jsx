// 결과가 길어 스크롤이 답답할 때, 하단 고정 바에서 상태별 섹션으로 바로 점프한다.
// 비어 있는 상태(count 0)는 점프할 곳이 없으니 칩을 안 그린다.
const ITEMS = [
  { id: "sec-eligible", label: "지원 가능", cls: "b-ok", key: "eligible" },
  { id: "sec-review", label: "확인 필요", cls: "b-review", key: "review" },
  { id: "sec-near", label: "거의 가능", cls: "b-near", key: "near" },
  { id: "sec-ineligible", label: "지원 불가", cls: "b-no", key: "ineligible" },
];

export default function BottomBar({ counts, onJumpIneligible }) {
  const visible = ITEMS.filter((it) => counts[it.key] > 0);
  if (!visible.length) return null;

  const jump = (id, key) => {
    if (key === "ineligible") onJumpIneligible?.(); // 접혀 있으면 펼쳐서 보여준다
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="bottom-bar">
      {visible.map((it) => (
        <button key={it.id} className={"bb-chip " + it.cls} onClick={() => jump(it.id, it.key)}>
          {it.label}<span className="bb-count">{counts[it.key]}</span>
        </button>
      ))}
    </nav>
  );
}
