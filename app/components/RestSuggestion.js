import Character from "./Character";
import HomeButton from "./HomeButton";

// onBackHome: "홈 화면으로 돌아가기" 버튼 클릭 시 호출
export default function RestSuggestion({ onBackHome }) {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        gap: "20px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          border: "6px solid var(--lavender-line)",
        }}
      />
      <h1 style={{ fontSize: "24px" }}>괜찮아, 잠깐 쉬어도 돼</h1>

      <HomeButton onClick={onBackHome} />
      <Character closed />
    </main>
  );
}
