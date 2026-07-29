import { LandingEvidenceSection } from "./landing/LandingEvidenceSection";
import { LandingFinalCta } from "./landing/LandingFinalCta";
import { LandingStatsSection } from "./landing/LandingStatsSection";
import { LandingUseCasesSection } from "./landing/LandingUseCasesSection";
import { LandingWorkroomSection } from "./landing/LandingWorkroomSection";
import { LandingWorkflowSection } from "./landing/LandingWorkflowSection";

type FigmaLandingContentProps = {
  onEnterWorkspace: () => void;
};

export function FigmaLandingContent({
  onEnterWorkspace,
}: FigmaLandingContentProps) {
  return (
    <>
      <LandingStatsSection />
      <LandingUseCasesSection />
      <LandingWorkflowSection />
      <LandingEvidenceSection />
      <LandingWorkroomSection onEnterWorkspace={onEnterWorkspace} />
      <LandingFinalCta onEnterWorkspace={onEnterWorkspace} />

      <footer className="bg-white">
        <div className="ptop-container flex items-center justify-between gap-5 px-5 py-6 font-mono text-[0.65rem] text-ptop-muted max-[760px]:flex-col max-[760px]:items-start">
          <strong className="text-ptop-landing-green">PtoP</strong>
          <span>Repository Analysis · Reflection · Portfolio Draft</span>
          <span>© 2026 PtoP</span>
        </div>
      </footer>
    </>
  );
}
