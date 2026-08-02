// T25: 실제 동시접속자 수가 아니라 장식용("혼자가 아니다"는 감각만 주는 목적, docs/prototype/
// feature-proposals.html 04번 프레임). 날짜 문자열을 시드로 써서 하루 동안은 같은 숫자를 보여준다.
// 화면 아래쪽은 캐릭터가 넓게 차지하고 있어서, 프로토타입처럼 화면 중앙이 아니라 상단 여백에
// 작은 알약 형태로 압축했다 — "아주 작은 점 몇 개로만 존재"하게 하려는 원래 의도에 더 맞는다.
function fakePresenceCount(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) % 1000;
  }
  return 80 + (hash % 121); // 80~200명
}

const DOT_COUNT = 5;
const ME_INDEX = 2;

// onDismiss: "혼자 할래요"를 눌렀을 때 호출(누르면 다시 안 보이게 하는 건 부모 책임).
export default function PresenceIndicator({ onDismiss }) {
  const today = new Date().toISOString().slice(0, 10);
  const count = fakePresenceCount(today);

  return (
    <div
      title="이름도, 채팅도 없어요. 그냥 같이 있다는 느낌만"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "var(--white)",
        border: "1px solid var(--cream-line)",
        borderRadius: "100px",
        padding: "6px 8px 6px 12px",
      }}
    >
      <div style={{ display: "flex", gap: "3px" }}>
        {Array.from({ length: DOT_COUNT }).map((_, i) => (
          <span
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: i === ME_INDEX ? "var(--rose-ink)" : "var(--lavender-line)",
              opacity: i === ME_INDEX ? 1 : 0.7,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: "11px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
        {count}명 함께 집중 중
      </span>
      <button
        onClick={onDismiss}
        aria-label="혼자 할래요"
        title="혼자 할래요"
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          color: "var(--ink-faint)",
          fontSize: "12px",
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}
