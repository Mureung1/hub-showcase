"use client";

// T18: Zero-Input 온보딩 화면. /api/notion-health가 ok:false를 반환했을 때만 보여준다.
// templateUrl: 복제할 노션 템플릿(Steps·AgentLog DB 포함) 공개 링크.
// onRecheck: "확인했어요" 클릭 시 /api/notion-health를 다시 호출하는 함수.
// isChecking: 재확인 요청 진행 중인지.
// checkMessage: 재확인 결과 메시지(성공/실패 모두, notion-health의 message 그대로).
const TEMPLATE_URL = "https://twilight-editor-6bf.notion.site/Kok-3acbe7e7125181588f68d69ebb8aa602?source=copy_link";
const INTEGRATIONS_URL = "https://www.notion.so/my-integrations";

const steps = [
  {
    title: "① 템플릿 복제하기",
    body: "아래 버튼으로 노션 템플릿을 여시고, 우측 상단 “Duplicate”를 눌러 본인 워크스페이스로 복제하세요.",
  },
  {
    title: "② Integration 만들고 연결하기",
    body: "노션 Integration 설정에서 새 Integration을 만들어 토큰을 발급받고, 방금 복제한 페이지에 연결(Connect)하세요.",
  },
  {
    title: "③ .env.local에 붙여넣기",
    body: "발급받은 토큰과, 복제한 두 데이터베이스(Steps·AgentLog) URL에서 뽑은 ID를 아래 형식으로 넣으세요.",
    code: "UPSTAGE_API_KEY=\nNOTION_TOKEN=\nNOTION_STEPS_DB_ID=\nNOTION_AGENTLOG_DB_ID=",
  },
  {
    title: "④ 서버 재시작 후 확인",
    body: "저장하고 서버를 재시작한 뒤, 아래 버튼으로 연결을 확인하세요.",
  },
];

export default function OnboardingGuide({ onRecheck, isChecking = false, checkMessage = null }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
        gap: "24px",
      }}
    >
      <h1 style={{ fontSize: "26px", textAlign: "center" }}>콕을 시작하기 전에</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: "15px", textAlign: "center", maxWidth: "440px" }}>
        콕은 노션을 데이터 저장소로 써요. 아래 순서대로 본인 노션에 연결해주세요.
      </p>

      <div style={{ width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {steps.map((s) => (
          <div
            key={s.title}
            style={{
              background: "var(--white)",
              border: "1px solid var(--cream-line)",
              borderRadius: "16px",
              padding: "18px 20px",
            }}
          >
            <h2 style={{ fontSize: "16px", marginBottom: "6px" }}>{s.title}</h2>
            <p style={{ fontSize: "14px", color: "var(--ink-soft)", lineHeight: 1.5 }}>{s.body}</p>
            {s.code && (
              <pre
                style={{
                  marginTop: "10px",
                  padding: "10px 12px",
                  background: "var(--cream)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                }}
              >
                {s.code}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <a
          href={TEMPLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "14px 28px",
            borderRadius: "100px",
            background: "var(--rose)",
            color: "var(--rose-ink)",
            fontSize: "15px",
          }}
        >
          템플릿 복제하러 가기
        </a>
        <a
          href={INTEGRATIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "14px 28px",
            borderRadius: "100px",
            background: "var(--sky)",
            color: "var(--sky-ink)",
            fontSize: "15px",
          }}
        >
          Integration 만들러 가기
        </a>
      </div>

      <button
        onClick={onRecheck}
        disabled={isChecking}
        style={{
          padding: "16px 40px",
          borderRadius: "100px",
          border: "none",
          background: "var(--lavender)",
          color: "var(--lavender-ink)",
          fontSize: "16px",
          cursor: isChecking ? "default" : "pointer",
          opacity: isChecking ? 0.6 : 1,
        }}
      >
        {isChecking ? "확인하는 중..." : "확인했어요, 연결 확인하기"}
      </button>

      {checkMessage && (
        <p style={{ fontSize: "14px", color: "var(--rose-ink)", textAlign: "center", maxWidth: "420px" }}>
          {checkMessage}
        </p>
      )}
    </main>
  );
}
