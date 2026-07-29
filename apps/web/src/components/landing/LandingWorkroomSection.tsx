import { workroomNotes } from "../../data/figmaLandingContent";
import { ScrollReveal } from "../ScrollReveal";

type LandingWorkroomSectionProps = {
  onEnterWorkspace: () => void;
};

const workspacePreviewUrl = `${import.meta.env.BASE_URL}assets/landing/workspace-preview.png`;
const poppyInsightUrl = `${import.meta.env.BASE_URL}assets/mascot/Poppy_Hi_NOBG.png`;

export function LandingWorkroomSection({
  onEnterWorkspace,
}: LandingWorkroomSectionProps) {
  return (
    <section
      className="bg-ptop-landing-lavender"
      aria-labelledby="landing-workroom-title"
    >
      <div className="ptop-landing-container py-[84px] pb-[90px]">
        <ScrollReveal className="mx-auto grid max-w-[760px] justify-items-center gap-4 text-center">
          <span className="rounded-full border border-[#c9ebd9] bg-white px-3.5 py-2 text-xs font-bold text-[#0f7a4e]">
            작업실
          </span>
          <h2
            className="m-0 text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.2] tracking-[-0.05em] text-ptop-landing-ink"
            id="landing-workroom-title"
          >
            나만의 공간을 즐겨보세요
          </h2>
          <p className="m-0 text-base leading-[1.75] text-ptop-muted [word-break:keep-all]">
            지난 분석 결과들을 수집하고, 새로운 분석을 시도하며 나만의 맞춤형
            작업공간을 직접 이동하여 만들어보세요
          </p>
        </ScrollReveal>

        <ScrollReveal
          className="mx-auto mt-10 max-w-[1120px] overflow-hidden rounded-[22px] border border-ptop-landing-ink/10 bg-white p-1.5 shadow-[0_16px_44px_rgb(20_35_28/14%)]"
          delay={100}
        >
          <img
            className="block h-auto w-full rounded-[17px]"
            src={workspacePreviewUrl}
            alt="PtoP 작업실에서 과거 프로젝트와 새 분석 PC를 확인하는 화면"
          />
        </ScrollReveal>

        <div className="mx-auto mt-5 grid max-w-[1120px] gap-4 md:grid-cols-3">
          {workroomNotes.map((note, index) => (
            <ScrollReveal key={note.title} delay={index * 80}>
              <article className="flex h-full gap-3 rounded-2xl bg-white px-[22px] py-5">
                {index === 0 ? (
                  <img
                    className="h-20 w-20 object-contain"
                    src={poppyInsightUrl}
                    alt=""
                    aria-hidden="true"
                  />
                ) : null}
                <div>
                  <h3 className="m-0 text-base font-extrabold tracking-[-0.025em] text-ptop-landing-ink">
                    {note.title}
                  </h3>
                  <p className="mb-0 mt-1.5 text-sm leading-[1.7] text-ptop-muted [word-break:keep-all]">
                    {note.description}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-8 flex justify-center" delay={180}>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-ptop-landing-green bg-white px-6 text-sm font-bold text-ptop-landing-green transition duration-[var(--motion-fast)] hover:-translate-y-0.5 hover:bg-[#effaf3] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ptop-landing-green"
            type="button"
            onClick={onEnterWorkspace}
          >
            작업실에서 직접 시작하기{" "}
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </button>
        </ScrollReveal>
      </div>
    </section>
  );
}
