type LandingFinalCtaProps = {
  onEnterWorkspace: () => void;
};

const poppyPCUrl = `${import.meta.env.BASE_URL}assets/mascot/Poppy_PC_Nobg.png`;

export function LandingFinalCta({ onEnterWorkspace }: LandingFinalCtaProps) {
  return (
    <section
      className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#F1F3F1_0%,#EAF6EF_42%,#DFF3E7_100%)] px-5 py-[20px] pb-[84px] text-center md:px-10"
      id="pricing"
      aria-labelledby="landing-final-cta-title"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[-120px] -z-10 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(111_227_168/30%),transparent)]"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-[680px] justify-items-center gap-5">
        <img
          className="block w-[min(40vw,400px)] object-contain drop-shadow-[0_16px_22px_rgb(11_42_28/24%)]"
          src={poppyPCUrl}
          alt="PtoP 마스코트 Poppy"
        />
        <h2
          className="m-0 text-[clamp(2.25rem,5vw,2.5rem)] font-extrabold leading-[1.16] tracking-[-0.055em] text-[#0b2a1c]"
          id="landing-final-cta-title"
        >
          지금 바로 시작하세요
        </h2>
        <p className="m-0 text-base font-semibold leading-[1.7] text-[#0b2a1c]/70">
          Github URL만 있다면 바로 도전해보세요
        </p>
        <button
          className="inline-flex min-h-14 items-center justify-center rounded-full bg-ptop-landing-ink px-8 text-base font-extrabold text-white shadow-[0_10px_26px_rgb(11_42_28/25%)] transition duration-[var(--motion-fast)] hover:-translate-y-0.5 hover:bg-[#20352b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ptop-landing-ink"
          type="button"
          onClick={onEnterWorkspace}
        >
          GitHub으로 시작하기{" "}
          <span className="ml-2 text-ptop-landing-lime" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </section>
  );
}
