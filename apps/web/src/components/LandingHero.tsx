import { LandingScrollHint } from "./LandingScrollHint";
import { GitHubMark } from "./GitHubMark";

type LandingHeroProps = {
  onStart: () => void;
};

export function LandingHero({ onStart }: LandingHeroProps) {
  const demoVideoUrl = `${import.meta.env.BASE_URL}assets/landing/ptop-demo.mp4`;
  const demoPosterUrl = `${import.meta.env.BASE_URL}assets/ptop-demo-preview.svg`;

  return (
    <>
      <section
        className="relative grid min-h-[90svh] overflow-hidden bg-[#e9f3ee] text-white [isolation:isolate]"
        id="service"
      >
        <div
          className="absolute inset-x-0 bottom-0 top-[calc(var(--header-height))] z-0 overflow-hidden"
          aria-hidden="true"
        >
          <video
            className="block h-full w-full object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={demoPosterUrl}
          >
            <source src={demoVideoUrl} type="video/mp4" />
          </video>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 top-[calc(var(--header-height))] z-10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.72)_22%,rgba(255,255,255,0.34)_50%,rgba(255,255,255,0.06)_78%,transparent_100%)] backdrop-blur-[0.5px]"
          aria-hidden="true"
        />
        <div className="relative z-20 flex items-start justify-center px-5 pb-8 pt-[clamp(150px,12vh,140px)] text-center sm:px-8">
          <div className="grid max-w-[860px] justify-items-center gap-3 sm:gap-6">
            <h1 className="m-0 text-[clamp(2.8rem,7vw,2.5rem)] font-extrabold leading-[1.12] tracking-[-0.065em] text-[#14231C] [word-break:keep-all]">
              프로젝트 경험을 포트폴리오로
              <br />
            </h1>
            <button
              className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-[#333a36] px-7 text-base font-extrabold text-[#6FE3A8] shadow-[0_12px_28px_rgba(20,35,28,0.16)] transition duration-300 hover:-translate-y-1 hover:bg-[#0f7a4e] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#16A46A] sm:px-8 sm:text-lg"
              type="button"
              onClick={onStart}
            >
              <GitHubMark />
              GitHub로 시작하기
            </button>
          </div>
        </div>
      </section>
      <LandingScrollHint />
    </>
  );
}
