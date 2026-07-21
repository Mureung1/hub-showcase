import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingHeader from "../components/brand-onboarding/OnboardingHeader";
import BrandInfoStep from "../components/brand-onboarding/BrandInfoStep";
import ChannelConnectStep from "../components/brand-onboarding/ChannelConnectStep";
import AnalyzingStep from "../components/brand-onboarding/AnalyzingStep";
import { CATEGORIES } from "../components/brand-onboarding/categories";
import { markOnboardingComplete } from "../lib/onboarding";

const TOTAL_STEPS = 3;

// 온보딩 화면 필드 -> BrandProfile API 필드(docs/api-spec.md) 매핑.
// oneLineIntro는 UI에서만 쓰는 소개 문구라 brandMood로 그대로 보낸다.
function toBrandProfileAnswers(brandInfo) {
  const category = CATEGORIES.find((c) => c.id === brandInfo.category);
  return {
    businessType: category?.label ?? brandInfo.category,
    storeName: brandInfo.brandName,
    mainProduct: brandInfo.mainProduct,
    targetCustomer: brandInfo.targets.join(", "),
    brandMood: brandInfo.oneLineIntro,
    strength: brandInfo.strength,
    tone: brandInfo.tone,
    goal: brandInfo.goal,
  };
}

function BrandOnboarding() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [brandInfo, setBrandInfo] = useState({
    category: "cafe",
    brandName: "OO카페",
    oneLineIntro: "우리 동네에서 가장 편안한 디저트 카페",
    targets: ["지역 주민"],
    mainProduct: "디저트",
    strength: "가성비",
    tone: "친근한 말투",
    goal: "신규 고객 유치",
  });
  const [channelConnected, setChannelConnected] = useState(false);
  const brandProfileAnswers = useMemo(() => toBrandProfileAnswers(brandInfo), [brandInfo]);

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
      {stepIndex === 2 && (
        <AnalyzingStep answers={brandProfileAnswers} onComplete={handleComplete} />
      )}
    </div>
  );
}

export default BrandOnboarding;
