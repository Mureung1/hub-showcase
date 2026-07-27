type LandingHeroProps = {
  onEnterWorkspace: () => void;
};

export function LandingHero({ onEnterWorkspace }: LandingHeroProps) {
  const demoVideoUrl = `${import.meta.env.BASE_URL}assets/landing/ptop-demo.mp4`;
  const demoPosterUrl = `${import.meta.env.BASE_URL}assets/ptop-demo-preview.svg`;

  return (
    <section
      className="relative grid min-h-[clamp(640px,92vh,900px)] overflow-hidden bg-[#e9f3ee] text-white [isolation:isolate]"
      id="service"
    >
      <div className="absolute inset-[var(--header-height)_0_0] z-0 overflow-hidden" aria-hidden="true">
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
      <div className="absolute bottom-6 left-5 z-10 sm:bottom-10 sm:left-8">
        <button
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-transparent bg-ptop-mint-dark px-6 text-base font-extrabold text-white shadow-[var(--shadow-primary)] transition duration-[var(--motion-fast)] hover:-translate-y-0.5 hover:bg-[var(--button-primary-hover)] hover:shadow-[0_14px_30px_rgb(21_24_23/20%)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ptop-mint-dark"
          type="button"
          onClick={onEnterWorkspace}
        >
          프로젝트 분석하러 가기
        </button>
      </div>
    </section>
  );
}
