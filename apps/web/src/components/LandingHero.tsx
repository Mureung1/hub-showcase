export function LandingHero() {
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
    </section>
  );
}
