import { analysisHighlights, landingSteps } from "../data/figmaLandingContent";

type FigmaLandingContentProps = {
  onEnterWorkspace: () => void;
};

const demoPreviewUrl = `${import.meta.env.BASE_URL}assets/ptop-demo-preview.svg`;
const workspacePreviewUrl = `${import.meta.env.BASE_URL}assets/landing/workspace-preview.png`;
const poppyImageUrl = `${import.meta.env.BASE_URL}assets/mascot/Poppy_Front.png`;

export function FigmaLandingContent({ onEnterWorkspace }: FigmaLandingContentProps) {
  return (
    <>
      <section className="bg-white" aria-labelledby="transformation-title">
        <div className="ptop-container grid justify-items-center gap-4 px-5 py-24 text-center max-[560px]:py-16">
          <p className="m-0 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ptop-landing-green">
            Transformation Quest
          </p>
          <h2 className="m-0 max-w-[760px] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.2] tracking-[-0.04em] text-ptop-ink" id="transformation-title">
            내 프로젝트의 기억을
            <br />
            <span className="text-ptop-landing-green">포트폴리오의 단서</span>로 바꿔보세요.
          </h2>
          <p className="m-0 max-w-[672px] text-base leading-[1.7] text-ptop-muted [word-break:keep-all]">
            방치된 GitHub 리포지토리를 연결하고 Poppy와 대화하세요.
            <br className="max-[560px]:hidden" />
            당신의 작업 흐름, 기술적 고민, 그리고 해결의 과정을 한눈에 정리해 드립니다.
          </p>
          <button
            className="mt-4 inline-flex min-h-12 items-center justify-center bg-ptop-landing-lime px-7 text-base font-semibold text-ptop-landing-ink transition duration-[var(--motion-fast)] hover:-translate-y-0.5 hover:bg-[var(--landing-lime-hover)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ptop-landing-green"
            type="button"
            onClick={onEnterWorkspace}
          >
            작업실 입장하기
          </button>
        </div>
      </section>

      <section className="bg-ptop-landing-lavender" id="workflow" aria-labelledby="landing-workflow-title">
        <div className="ptop-container px-5 py-24 max-[560px]:py-16">
          <h2 className="sr-only" id="landing-workflow-title">PtoP 사용 흐름</h2>
          <ol className="m-0 grid list-none grid-cols-3 gap-12 p-0 max-[760px]:grid-cols-1 max-[760px]:gap-10">
            {landingSteps.map((step) => (
              <li className="grid justify-items-center gap-4 text-center" key={step.number}>
                <span className="grid h-16 w-16 place-items-center border-2 border-ptop-landing-lime bg-[#e1e2ec] font-mono text-2xl font-bold text-ptop-landing-green">
                  {step.number}
                </span>
                <h3 className="m-0 text-xl font-semibold text-ptop-ink">{step.title}</h3>
                <p className="m-0 max-w-[280px] text-sm leading-[1.65] text-[#41484d] [word-break:keep-all]">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white" id="features" aria-labelledby="intelligence-title">
        <div className="ptop-container grid grid-cols-[minmax(260px,0.85fr)_minmax(0,1.15fr)] items-center gap-16 px-5 py-24 max-[860px]:grid-cols-1 max-[560px]:py-16">
          <div className="grid gap-7">
            <div className="grid gap-3">
              <p className="m-0 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ptop-landing-green">Core Intelligence</p>
              <h2 className="m-0 max-w-[360px] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.15] tracking-[-0.04em] text-ptop-ink" id="intelligence-title">
                데이터가 증명하는
                <br />
                당신의 전문성
              </h2>
            </div>
            <ul className="m-0 grid list-none gap-5 p-0">
              {analysisHighlights.map((highlight) => (
                <li className="grid grid-cols-[20px_minmax(0,1fr)] gap-3" key={highlight.title}>
                  <span className="mt-1.5 text-sm font-bold text-ptop-landing-green" aria-hidden="true">✦</span>
                  <div className="grid gap-1">
                    <h3 className="m-0 text-base font-semibold text-ptop-ink">{highlight.title}</h3>
                    <p className="m-0 text-sm leading-[1.6] text-[#41484d] [word-break:keep-all]">{highlight.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden border border-ptop-landing-line bg-ptop-landing-lavender p-[18px]">
            <img className="block h-auto w-full border border-ptop-landing-line bg-[#0c1715]" src={demoPreviewUrl} alt="PtoP 분석 결과 화면 예시" />
            <span className="absolute bottom-7 right-7 grid h-8 w-8 place-items-center border border-[#9ee9b9] bg-white font-mono text-sm text-ptop-landing-green" aria-hidden="true">✣</span>
          </div>
        </div>
      </section>

      <section className="bg-white" aria-labelledby="reflection-title">
        <div className="ptop-container grid grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)] items-center gap-16 px-5 py-24 max-[760px]:grid-cols-1 max-[560px]:py-16">
          <div className="grid max-w-[540px] gap-5">
            <div className="border border-ptop-landing-green bg-ptop-landing-lavender p-3 font-mono text-xs leading-[1.6] text-[#41484d]">
              “이 프로젝트에서 가장 해결하기 어려웠던 문제는 무엇이었나요?”
              <span className="mt-2 block h-1 w-1 bg-ptop-landing-lime" aria-hidden="true" />
            </div>
            <h2 className="m-0 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.15] tracking-[-0.04em] text-ptop-ink" id="reflection-title">부담 없는 회고의 시간</h2>
            <p className="m-0 max-w-[460px] text-base leading-[1.7] text-ptop-muted [word-break:keep-all]">
              글쓰기가 두려워 멈춰있던 포트폴리오.
              <br />
              Poppy가 던지는 가벼운 질문에 답하다 보면, 어느새 당신의 고민과 경험이 정리됩니다.
            </p>
            <div className="flex flex-wrap gap-2 font-mono text-[0.68rem] text-[#006d36]" aria-label="회고 키워드">
              <span className="bg-[#e1f9e9] px-2 py-1">#문제정의</span>
              <span className="bg-[#e1f9e9] px-2 py-1">#해결과정</span>
              <span className="bg-[#e1f9e9] px-2 py-1">#회고</span>
            </div>
          </div>
          <div className="grid min-h-[260px] place-items-center bg-[#fbfffd]">
            <img className="block max-h-[300px] w-full max-w-[300px] object-contain" src={poppyImageUrl} alt="PtoP 마스코트 Poppy" />
          </div>
        </div>
      </section>

      <section className="bg-white" aria-labelledby="workspace-preview-title">
        <div className="ptop-container grid justify-items-center gap-3 px-5 pb-24 text-center max-[560px]:pb-16">
          <h2 className="m-0 text-2xl font-semibold text-ptop-ink" id="workspace-preview-title">프로젝트를 분석하는 공간</h2>
          <p className="m-0 text-sm text-ptop-muted">과거의 프로젝트를 다시 열어보고, 새로운 프로젝트를 시작하는 작업실입니다.</p>
          <div className="mt-5 w-full overflow-hidden border border-ptop-landing-line bg-ptop-landing-lavender p-1.5">
            <img className="block h-auto w-full" src={workspacePreviewUrl} alt="PtoP 작업실에서 프로젝트 분석을 시작하는 화면" />
          </div>
        </div>
      </section>

      <section className="bg-ptop-landing-lavender" aria-labelledby="final-cta-title">
        <div className="ptop-container grid justify-items-center gap-5 px-5 py-24 text-center max-[560px]:py-16">
          <h2 className="m-0 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.15] tracking-[-0.04em] text-ptop-ink" id="final-cta-title">
            이제 첫 프로젝트를
            <br />
            다시 열어볼까요?
          </h2>
          <button
            className="inline-flex min-h-12 items-center justify-center bg-ptop-landing-lime px-7 text-base font-semibold text-ptop-landing-ink transition duration-[var(--motion-fast)] hover:-translate-y-0.5 hover:bg-[var(--landing-lime-hover)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ptop-landing-green"
            type="button"
            onClick={onEnterWorkspace}
          >
            내 작업실 시작하기
          </button>
          <p className="m-0 font-mono text-xs text-[#41484d]">◉ Free for individual　⌘ GitHub Sync</p>
        </div>
      </section>

      <footer className="bg-white">
        <div className="ptop-container flex items-center justify-between gap-5 px-5 py-6 font-mono text-[0.65rem] text-[#41484d] max-[760px]:flex-col max-[760px]:items-start">
          <strong className="text-ptop-landing-green">PtoP</strong>
          <span>Terms of Service　 Privacy Policy　 GitHub Integration　 Discord Support</span>
          <span>© 2026 PtoP</span>
        </div>
      </footer>
    </>
  );
}
