import { FigmaLandingContent } from "../components/FigmaLandingContent";
import { LandingHero } from "../components/LandingHero";

type LandingPageProps = {
  onEnterWorkspace: () => void;
};

export function LandingPage({ onEnterWorkspace }: LandingPageProps) {
  return (
    <>
      <LandingHero />
      <FigmaLandingContent onEnterWorkspace={onEnterWorkspace} />
    </>
  );
}
