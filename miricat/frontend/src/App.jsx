/*
 * 미리캣 프론트엔드.
 *
 * UI 흐름은 docs/prototype-flow.html 참고 (바닐라로 만든 동작 프로토타입):
 *   ① 경로 등록 → ② 확인 보고 → ③ 확인 과정 → ④ 알림 도착 → ⑤ 자세히 보기
 *
 * ⚠️ 사용자 UI 원칙 (CLAUDE.md):
 *   개발자 용어(LangGraph/Verifier/JSON/trace 등) 화면 노출 금지. 쉬운 말로.
 *   캐릭터(미어캣)는 무조건 등장. 대안 경로는 명확한 추천으로.
 *
 * TODO: 프로토타입을 React 컴포넌트로 이식
 *   - components/RouteRegister.jsx  (경로 등록 + 지도 후보 선택)
 *   - components/DailyReport.jsx     (확인 보고 채널)
 *   - components/Investigation.jsx   (미리캣이 확인하는 중)
 *   - components/AlertChannel.jsx    (디스코드 스타일 알림)
 *   - components/Briefing.jsx        (리포트: 지도 + 추천 + 조사 과정)
 *   - components/Miricat.jsx         (미어캣 SVG 캐릭터)
 */
export default function App() {
  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>미리캣 🐾</h1>
      <p style={{ color: "var(--slate)", marginTop: 8 }}>
        내 출근길의 보초. UI 흐름은 <code>docs/prototype-flow.html</code> 참고해서 이식 예정.
      </p>
    </div>
  );
}
