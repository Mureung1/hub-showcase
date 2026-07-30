import { ScrollReveal } from "../ScrollReveal";

const useCases = [
  {
    label: "취업 준비생",
    title: "팀플 3개 했는데 뭘 썼다고 해야 하죠?",
  },
  {
    label: "부트캠프 수료생",
    title: "수료 프로젝트가 다 비슷해 보여요",
  },
  {
    label: "팀 프로젝트 정리",
    title: "누가 뭘 했는지 기억이 안 나요",
  },
  {
    label: "이직 준비",
    title: "경력 기술서 쓸 시간이 없어요",
  },
] as const;

export function LandingUseCasesSection() {
  return (
    <section
      className="scroll-mt-[var(--header-height)] bg-white"
      id="features"
      aria-labelledby="landing-use-cases-title"
    >
      <div className="ptop-landing-container px-5 pb-[84px] pt-4 md:px-10">
        <ScrollReveal className="mb-[34px] text-center">
          <h2
            className="m-0 text-[clamp(2rem,4vw,2.375rem)] font-extrabold leading-[1.32] tracking-[-0.04em] text-[#14231C]"
            id="landing-use-cases-title"
          >
            프로젝트가 너무 많아 관리가 어렵지 않나요?
          </h2>
          <p className="m-0 mt-2.5 text-[15.5px] font-medium leading-[1.7] text-[#4A5A53]">
            저희가 쉽게 분석해드릴게요! 이런 분들께 PtoP를 추천드립니다
          </p>
        </ScrollReveal>

        <ScrollReveal
          className="mb-[26px] grid gap-1 md:grid-cols-4"
          delay={80}
        >
          {useCases.map((useCase) => (
            <div
              className="flex min-h-[170px] flex-col rounded-[18px] border border-[rgba(20,35,28,0.12)] bg-white px-6 pb-6 pt-6 shadow-[0_8px_24px_rgba(20,35,28,0.05)] md:min-h-[170px] md:px-7 md:pb-7 md:pt-7"
              key={useCase.label}
            >
              <span className="self-start rounded-full bg-[#E4F7EC] px-3.5 py-2 text-[12px] font-bold leading-none text-[#0F7A4E]">
                {useCase.label}
              </span>
              <h3 className="m-0 mt-auto text-[clamp(1.25rem,2vw,1.2rem)] font-bold leading-[1.4] tracking-[-0.035em] text-[#14231C] [word-break:keep-all]">
                “{useCase.title}”
              </h3>
            </div>
          ))}
        </ScrollReveal>

        <ScrollReveal
          className="grid overflow-hidden rounded-[22px] border border-[#C9EBD9] bg-[#F3FBF6] p-6 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-11 md:p-[38px_40px]"
          delay={140}
        >
          <div>
            <p className="m-0 text-[15px] font-bold text-[#0F7A4E]">
              협업 프로젝트는 다양한 사람의 작업이 담겨있습니다
            </p>
            <h3 className="m-0 mt-7 text-[clamp(2rem,4vw,1rem)] font-extrabold leading-[1.35] tracking-[-0.05em] text-[#14231C] [word-break:keep-all]">
              프로젝트에서 나의 역할만 분석합니다
            </h3>
            <p className="m-0 mt-7 text-[15px] leading-[1.85] text-[#38473F] [word-break:keep-all]">
              저장소를 붙이면 당신의 GitHub ID로 커밋·PR·리뷰를 걸러내 기여율과
              실제로 만진 파일을 보여줍니다. 남의 작업을 내 것처럼 쓸 걱정이
              없습니다.
            </p>
            <ul className="m-0 mt-6 grid list-none gap-3 p-0 text-sm font-semibold text-[#14231C]">
              <li className="flex items-center gap-2">
                <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-[#6FE3A8] text-[10px] text-[#0B2A1C]">
                  ✓
                </span>
                내 커밋만 분리해 기여율 계산
              </li>
              <li className="flex items-center gap-2">
                <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-[#6FE3A8] text-[10px] text-[#0B2A1C]">
                  ✓
                </span>
                면접에서 그대로 말할 수 있는 문장
              </li>
              <li className="flex items-center gap-2">
                <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-[#6FE3A8] text-[10px] text-[#0B2A1C]">
                  ✓
                </span>
                근거 링크가 붙어 거짓말이 아님
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[rgba(20,35,28,0.08)] bg-white px-6 py-[22px] shadow-[0_8px_24px_rgba(20,35,28,0.07)]">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#C9EBD9] pb-5">
              <span className="text-[16px] font-bold leading-none text-[#14231C]">
                나의 기여 · SubJeeLee/hub
              </span>
              <span className="rounded-full bg-[#E4F7EC] px-3 py-1.5 font-mono text-xs font-bold text-[#0F7A4E]">
                @SubJeeLee
              </span>
            </div>
            <div className="mb-5 flex items-end justify-between gap-4">
              <span className="text-[15px] font-semibold text-[#4A5A53]">
                커밋
              </span>
              <span className="font-mono text-[25px] font-extrabold tracking-[-0.04em] text-[#14231C]">
                137{" "}
                <small className="text-[15px] font-semibold text-[#4A5A53]">
                  / 218
                </small>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#E9EEEB]">
              <div className="h-full w-[63%] rounded-full bg-[#16A46A]" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <ContributionStat value="29" label="merged PR" />
              <ContributionStat value="58" label="받은 리뷰" />
              <ContributionStat value="41" label="만진 파일" />
            </div>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[#E9EEEB]">
              <span className="w-[61%] bg-[#16A46A]" />
              <span className="w-[18%] bg-[#6FE3A8]" />
              <span className="w-[13%] bg-[#B9EBD0]" />
            </div>
            <p className="m-0 mt-3 font-mono text-[13px] font-medium text-[#718078]">
              TypeScript 61.2% · CSS 18.4% · JS 12.9%
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function ContributionStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white px-2 py-3">
      <p className="m-0 font-mono text-lg font-extrabold tracking-[-0.04em] text-[#14231C]">
        {value}
      </p>
      <p className="m-0 mt-1 text-[11px] font-semibold text-[#4A5A53]">
        {label}
      </p>
    </div>
  );
}
