const highlights = [
  '맞춤 커리큘럼 제안',
  '공식 문서 기반 설명',
  '바로 실습하는 에디터',
  '진도와 오답 관리',
]

export default function ProjectIntro() {
  return (
    <section className="intro" aria-labelledby="project-title">
      <div className="intro__content">
        <p className="intro__eyebrow">DevChat AI Coding Tutor</p>
        <h1 id="project-title">새 기술, 어디서부터 배울지 막막할 때</h1>
        <p className="intro__description">
          DevChat은 사용자의 목표와 현재 수준을 바탕으로 오늘 배울 순서, 필요한 개념,
          실습 과제를 함께 짜주는 AI 코딩 튜터입니다. 문서 탐색부터 코드 실행, 복습까지
          한 흐름으로 이어집니다.
        </p>

        <ul className="intro__highlights" aria-label="핵심 기능">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="workspace-preview" aria-label="DevChat 화면 미리보기">
        <div className="preview-chat">
          <div className="preview-message preview-message--user">
            <span>사용자</span>
            <p>React를 배워야 하는데 뭐부터 해야 할지 모르겠어요.</p>
          </div>
          <div className="preview-message preview-message--ai">
            <span>AI 튜터</span>
            <p>먼저 컴포넌트, props, state 순서로 잡아볼게요. 오늘은 버튼 상태 실습까지 진행합니다.</p>
          </div>
          <div className="preview-message preview-message--ai">
            <span>오늘의 커리큘럼</span>
            <p>개념 설명 → 짧은 퀴즈 → 에디터 실습 → 실행 결과 피드백 순서로 학습해요.</p>
          </div>
        </div>

        <div className="preview-editor">
          <div className="preview-toolbar">
            <span>Counter.jsx</span>
            <button type="button">실행</button>
          </div>
          <pre>{`function Counter() {
  const [count, setCount] = useState(0)

  return <button>{count}</button>
}`}</pre>
          <div className="preview-result">다음 단계: 클릭 이벤트 연결하기</div>
        </div>
      </div>
    </section>
  )
}
