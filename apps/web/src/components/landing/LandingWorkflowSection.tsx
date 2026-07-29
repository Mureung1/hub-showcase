import { landingSteps } from "../../data/figmaLandingContent";
import { ScrollReveal } from "../ScrollReveal";

const poppyInsightUrl = `${import.meta.env.BASE_URL}assets/mascot/Poppy_Insite_NOBG.png`;

const workflowVisuals = [
  <div className="flex h-full flex-col justify-center gap-2 p-6" aria-hidden="true">
    <div className="flex items-center gap-1.5 rounded-[10px] bg-white px-[15px] py-[13px] font-mono text-xs font-medium text-[#14231C] shadow-[0_2px_8px_rgba(20,35,28,0.06)]">
      <span className="text-[#14231C]/35">github.com/</span>SubJeeLee/hub
      <span className="h-3.5 w-px animate-[ptop-caret_1.1s_steps(1)_infinite] bg-[#16A46A]" />
    </div>
    <div className="rounded-[10px] bg-white px-[15px] py-[13px] font-mono text-xs font-medium text-[#14231C] shadow-[0_2px_8px_rgba(20,35,28,0.06)]">
      @SubJeeLee
    </div>
    <div className="self-start rounded-full bg-[#14231C] px-[18px] py-2.5 text-xs font-bold leading-none text-white">
      분석 시작
    </div>
  </div>,
  <div
    className="relative flex h-full flex-col gap-[5px] overflow-hidden bg-[#14231C] px-5 py-[18px] font-mono text-[11px] leading-[1.7] text-[#6FE3A8]/90"
    aria-hidden="true"
  >
    <span>
      › 커밋 218개 수집 <em className="not-italic text-white/30">done</em>
    </span>
    <span>
      › @SubJeeLee 커밋 137개 식별{" "}
      <em className="not-italic text-white/30">done</em>
    </span>
    <span>
      › PR 34개 · Issue 21개 파싱{" "}
      <em className="not-italic text-white/30">done</em>
    </span>
    <span>
      › 파일 트리 412개 스캔<span className="text-[#6FE3A8]">▌</span>
    </span>
    <div className="mt-auto mr-[76px] rounded-[10px] border border-[#6FE3A8]/35 bg-[#6FE3A8]/10 px-[13px] py-[11px] font-brand text-[11.5px] font-semibold leading-[1.5] text-white/90">
      가장 오래 붙잡았던 문제는?
      <div className="mt-1.5 h-4 rounded bg-white/10" />
    </div>
    <img
      className="absolute -bottom-2 -right-1 w-[104px]"
      src={poppyInsightUrl}
      alt="Poppy"
    />
  </div>,
  <div
    className="flex h-full flex-col justify-center gap-[9px] bg-[#E9EEEB] px-[22px]"
    aria-hidden="true"
  >
    <div className="rounded-xl border-2 border-[#6FE3A8] bg-white px-[15px] py-[13px] shadow-[0_4px_12px_rgba(30,180,120,0.16)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-bold leading-[1.4] text-[#14231C]">
          OAuth 토큰 만료 재시도 설계
        </span>
        <span className="shrink-0 font-mono text-[10px] font-bold text-[#0F7A4E]">
          0.86
        </span>
      </div>
      <div className="mt-1.5 text-[11px] leading-[1.5] text-[#4A5A53]">
        근거 4건 · PR #142 · 8f3c1a9
      </div>
    </div>
    <div className="rounded-xl bg-white px-[15px] py-[13px] opacity-60">
      <div className="text-[12.5px] font-bold leading-[1.4] text-[#14231C]">
        대용량 트리 렌더 성능 개선
      </div>
    </div>
    <div className="rounded-xl bg-white px-[15px] py-[13px] opacity-35">
      <div className="text-[12.5px] font-bold leading-[1.4] text-[#14231C]">
        CI 파이프라인 분리
      </div>
    </div>
  </div>,
];

export function LandingWorkflowSection() {
  return (
    <section
      className="bg-[#F1F3F1]"
      id="workflow"
      aria-labelledby="landing-workflow-title"
    >
      <div className="ptop-landing-container py-[84px]">
        <ScrollReveal className="mb-10 text-center">
          <h2
            className="m-0 text-[clamp(2rem,4vw,2.375rem)] font-extrabold leading-[1.32] tracking-[-0.04em] text-[#14231C]"
            id="landing-workflow-title"
          >
            단 두번의 질문만 답해주시면,
            <br />
            나머지는 저희가 직접 분석해드립니다
          </h2>
        </ScrollReveal>

        <div className="grid gap-5 md:grid-cols-3">
          {landingSteps.map((step, index) => (
            <ScrollReveal key={step.number} delay={index * 90}>
              <article className="h-full overflow-hidden rounded-[20px] border border-[rgba(20,35,28,0.14)] bg-white shadow-[0_8px_24px_rgba(20,35,28,0.09)]">
                <div className="h-[200px] overflow-hidden border-b border-[rgba(20,35,28,0.12)] bg-[#E9EEEB]">
                  {workflowVisuals[index]}
                </div>
                <div className="px-[26px] pb-[30px] pt-[26px]">
                  <p className="m-0 text-[30px] font-extrabold leading-none tracking-[-0.04em] text-[#6FE3A8]">
                    {step.number}
                  </p>
                  <h3 className="mb-[9px] mt-3 text-xl font-extrabold leading-[1.4] tracking-[-0.03em] text-[#14231C]">
                    {step.title}
                  </h3>
                  <p className="m-0 text-sm font-medium leading-[1.75] text-[#4A5A53] [word-break:keep-all]">
                    {step.description}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
