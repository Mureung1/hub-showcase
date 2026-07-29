export function LandingScrollHint() {
  const scrollToContent = () => {
    document.getElementById("landing-content-start")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="relative z-10 flex justify-center bg-white py-5 sm:py-7">
      <button
        className="group flex flex-col items-center gap-2 border-0 bg-transparent px-5 py-1 text-[#9aa39f] transition-colors hover:text-[#14231C] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#16A46A]"
        type="button"
        aria-label="다음 랜딩 콘텐츠 보기"
        onClick={scrollToContent}
      >
        <span className="text-sm font-bold tracking-[-0.02em] sm:text-base">
          PtoP를 소개할게요. 스크롤 해주세요!
        </span>
        <span
          className="grid h-10 w-10 place-items-center  transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        >
          <span className="font-brand text-[28px] font-medium leading-none animate-[ptop-scroll-arrow_1.5s_ease-in-out_infinite]">
            ↓
          </span>
        </span>
      </button>
    </div>
  );
}
