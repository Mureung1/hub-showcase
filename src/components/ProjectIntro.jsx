import './ProjectIntro.css'

const loop = [
  {
    step: '01',
    title: '감시',
    summary: '언제 사고팔지 신호를 준다',
    body: '평소 말투로 조건을 걸면 한국투자증권 Open API로 국내·미국 시장을 24시간 대신 지켜보다가, 그 순간이 오면 Discord로 알려줍니다.',
  },
  {
    step: '02',
    title: '기록',
    summary: '무엇을 왜 했는지 남긴다',
    body: '알림을 받고 실제로 매매한 기록은 차트 위에 그대로 남습니다. 진입 시점과 판단의 근거가 시각적으로 쌓입니다.',
  },
  {
    step: '03',
    title: '복기',
    summary: '그 판단이 옳았는지 코칭한다',
    body: 'AI가 거래를 복기합니다. 진입 타이밍은 적절했는지, 감정에 휘둘리지는 않았는지, 반복되는 실수 패턴은 없는지를 짚어줍니다.',
  },
]

const commands = [
  '삼성전자가 8만 원이 되면 알려줘',
  '애플이 60일선 아래로 내려가면 신호 줘',
]

function ProjectIntro() {
  return (
    <>
      <section id="intro-hero">
        <span className="eyebrow">AI Agent · 대화형 투자 코치</span>
        <h1>
          <span className="brand">Beacon</span>
        </h1>
        <p className="lede">
          말을 걸면 지켜보고, 되돌아보게 하는 AI 투자 코치
        </p>

        <div className="prose">
          <p>
            <strong>Beacon</strong>은 복잡한 설정 화면이나 명령어 대신{' '}
            <em>대화</em>로 움직이는 투자 코치입니다. 평소 말투로 조건을 걸면,
            Beacon이 한국투자증권 Open API로 국내·미국 시장을 24시간 대신
            지켜보다가 그 순간이 오면 Discord로 알려줍니다.
          </p>
          <p>
            여기서 끝이 아닙니다. 알림을 받고 실제로 매매한 기록은 차트 위에
            그대로 남고, AI가 그 거래를 <strong>복기</strong>합니다. 진입 타이밍은
            적절했는지, 감정에 휘둘려 계획을 벗어나지는 않았는지, 반복되는 실수
            패턴은 없는지를 짚어주죠. 사용자는 단순히 알림을 받는 데 그치지 않고,
            자신의 투자 습관이 어디서 무너지는지를 데이터로 마주하며 조금씩
            나아집니다.
          </p>
          <p>
            즉 Beacon은 <strong>감시 → 기록 → 복기</strong>로 이어지는 하나의
            학습 루프를, 사용자가 그저 말을 거는 것만으로 돌아가게 만드는 대화형
            투자 에이전트입니다.
          </p>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="intro-commands">
        <h2>이렇게 말만 걸면 됩니다</h2>
        <ul className="chat">
          {commands.map((text) => (
            <li key={text}>
              <span className="bubble">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="ticks"></div>

      <section id="intro-loop">
        <h2>감시 · 기록 · 복기의 학습 루프</h2>
        <div className="loop-grid">
          {loop.map((item) => (
            <article className="loop-card" key={item.step}>
              <span className="step">{item.step}</span>
              <h3>{item.title}</h3>
              <p className="summary">{item.summary}</p>
              <p className="detail">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="ticks"></div>

      <section id="intro-foundation">
        <h2>두 프로젝트를 하나로</h2>
        <div className="foundation-grid">
          <div className="foundation-card">
            <span className="role">감시하는 눈 · 자연어 입력</span>
            <p>
              한국투자증권 Open API 기반 서버리스 알림 봇. 국내·미국 현재가와
              이동평균선 조건을 감시하고, 자연어로 건 조건을 Discord 알림으로
              전달합니다.
            </p>
          </div>
          <div className="foundation-card">
            <span className="role">복기하는 코치 · 차트 기록</span>
            <p>
              투자 기록을 차트 위에 남기고, AI가 거래 과정의 리스크와 취약점을
              복기해 주는 웹앱. Beacon의 학습 루프에서 &lsquo;성장&rsquo;을
              담당합니다.
            </p>
          </div>
        </div>
        <p className="stack">
          <code>KIS Open API</code>
          <code>Discord</code>
          <code>Gemini</code>
          <code>Next.js</code>
          <code>Supabase</code>
          <code>lightweight-charts</code>
        </p>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default ProjectIntro
