import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingHeader from "../components/brand-onboarding/OnboardingHeader";
import BrandInfoStep from "../components/brand-onboarding/BrandInfoStep";
import ChannelConnectStep from "../components/brand-onboarding/ChannelConnectStep";
import AnalyzingStep from "../components/brand-onboarding/AnalyzingStep";
import { markOnboardingComplete } from "../lib/onboarding";

const TOTAL_STEPS = 3;

function BrandOnboarding() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [brandInfo, setBrandInfo] = useState({
    category: "cafe",
    brandName: "OO카페",
    oneLineIntro: "우리 동네에서 가장 편안한 디저트 카페",
    targets: ["지역 주민"],
  });
  const [channelConnected, setChannelConnected] = useState(false);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, TOTAL_STEPS - 1));
  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleComplete = () => {
    markOnboardingComplete();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {stepIndex === 0 && (
        <>
          <OnboardingHeader />
          <BrandInfoStep value={brandInfo} onChange={setBrandInfo} onNext={goNext} />
        </>
      )}
      {stepIndex === 1 && (
        <ChannelConnectStep
          connected={channelConnected}
          onConnect={() => setChannelConnected(true)}
          onDisconnect={() => setChannelConnected(false)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
      {stepIndex === 2 && <AnalyzingStep onComplete={handleComplete} />}
    </div>
  );
}

export default BrandOnboarding;
