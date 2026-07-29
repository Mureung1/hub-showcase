import { ScrollReveal } from "../ScrollReveal";

type LandingIntroSectionProps = {
  onEnterWorkspace: () => void;
};

const poppyHiUrl = `${import.meta.env.BASE_URL}assets/mascot/Poppy_Hi_NOBG.png`;

export function LandingIntroSection({
  onEnterWorkspace,
}: LandingIntroSectionProps) {
  return (
    <section className="overflow-hidden bg-white" aria-labelledby="landing-intro-title">
      <div className="ptop-container grid items-center gap-12 px-5 py-24 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:py-32">
        <ScrollReveal className="order-2 grid gap-6 md:order-1">
          <p className="m-0 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ptop-landing-green">
            From project memory to portfolio clue
          </p>
          <h2
            className="m-0 max-w-[680px] text-[clamp(2.15rem,5vw,4.2rem)] font-extrabold leading-[1.12] tracking-[-0.055em] text-ptop-landing-ink"
            id="landing-intro-title"
          >
            프로젝트를 완성하고도,
            <br />
            <span className="text-ptop-landing-green">뭐가 어려웠는지</span>
            <br />
            기억나지 않을 때
          </h2>
          <p className="m-0 max-w-[520px] text-base leading-[1.8] text-ptop-muted [word-break:keep-all] md:text-lg">
            저장소 하나와 짧은 회고로 시작해요.
            <br />
            PtoP가 작업 흐름과 기술적 고민을 다시 꺼내 포트폴리오의 단서로
            정리합니다.
          </p>
          <div>
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-ptop-landing-lime px-7 text-base font-bold text-ptop-landing-ink shadow-[0_10px_24px_rgb(0_109_54/14%)] transition duration-[var(--motion-fast)] hover:-translate-y-0.5 hover:bg-[var(--landing-lime-hover)] hover:shadow-[0_14px_28px_rgb(0_109_54/18%)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ptop-landing-green"
              type="button"
              onClick={onEnterWorkspace}
            >
              프로젝트 분석 시작하기 <span className="ml-2" aria-hidden="true">→</span>
            </button>
          </div>
          <p className="m-0 text-xs text-ptop-muted">
            GitHub 읽기 권한만 요청합니다 · 코드 원문은 저장하지 않습니다
          </p>
        </ScrollReveal>

        <ScrollReveal className="order-1 relative grid min-h-[330px] place-items-center md:order-2" delay={120}>
          <div className="absolute inset-[12%_8%_8%] rounded-[40%] bg-ptop-landing-lavender blur-3xl" aria-hidden="true" />
          <img
            className="relative block w-[min(78vw,410px)] object-contain drop-shadow-[0_22px_24px_rgb(20_35_28/18%)] motion-safe:animate-[ptop-bob_3.2s_ease-in-out_infinite]"
            src={poppyHiUrl}
            alt="PtoP 마스코트 Poppy가 인사하는 모습"
          />
        </ScrollReveal>
      </div>
    </section>
  );
}
