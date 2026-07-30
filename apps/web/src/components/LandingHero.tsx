import { LandingScrollHint } from "./LandingScrollHint";
import { GitHubMark } from "./GitHubMark";

type LandingHeroProps = {
  onStart: () => void;
};

export function LandingHero({ onStart }: LandingHeroProps) {
  const workspaceHeroUrl = `${import.meta.env.BASE_URL}assets/landing/workspace-hero.png`;

  return (
    <>
      <section
        className="relative grid min-h-[88svh] overflow-hidden bg-[#e9f3ee] text-white [isolation:isolate]"
        id="service"
      >
        <div
          className="absolute inset-x-0 bottom-0 top-[calc(var(--header-height))] z-0 overflow-hidden"
          aria-hidden="true"
        >
          <img
            className="h-full w-full object-cover object-center"
            src={workspaceHeroUrl}
            alt=""
          />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 top-[calc(var(--header-height))] z-10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.52)_25%,rgba(255,255,255,0.18)_58%,rgba(255,255,255,0.03)_82%,transparent_100%)]"
          aria-hidden="true"
        />
        <div className="relative z-20 flex items-start justify-center px-5 pb-8 pt-[clamp(82px,10vh,128px)] text-center sm:px-8">
          <div className="grid mt-15 max-w-[960px] justify-items-center gap-4 sm:gap-4">
            <span className="inline-flex items-center rounded-full border border-[#14231C] bg-white/80 px-5 py-2 text-xs font-bold text-[#14231C] shadow-[0_2px_10px_rgb(20_35_28/8%)]">
              Github 저장소 하나로 해결
            </span>
            <h1 className="m-0 text-[clamp(2.8rem,6.6vw,3.6rem)] font-extrabold leading-[1.08] tracking-[-0.07em] text-[#14231C] [word-break:keep-all]">
              지난 프로젝트에서
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">
                  내가 해결한 문제를 찾아드려요
                </span>
                <span
                  className="absolute bottom-[0.05em] left-4 z-0 h-[0.22em] w-[55%] rounded-sm bg-[#6FE3A8]"
                  aria-hidden="true"
                />
              </span>
            </h1>
            <button
              className="inline-flex min-h-14 mt-2 items-center justify-center gap-2.5 rounded-full bg-[#14231C] px-6 text-base font-extrabold text-white shadow-[0_10px_24px_rgb(20_35_28/18%)] transition duration-300 hover:-translate-y-1 hover:bg-[#0f7a4e] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#16A46A] sm:px-7 sm:text-sm"
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
