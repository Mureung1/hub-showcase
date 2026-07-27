import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OnboardingHeader from "../components/brand-onboarding/OnboardingHeader";
import BrandInfoStep from "../components/brand-onboarding/BrandInfoStep";
import ChannelConnectStep from "../components/brand-onboarding/ChannelConnectStep";
import AnalyzingStep from "../components/brand-onboarding/AnalyzingStep";
import { CATEGORIES } from "../components/brand-onboarding/categories";
import { markOnboardingComplete } from "../lib/onboarding";
import { BASE_URL } from "../api/client";

const TOTAL_STEPS = 3;
const BRAND_INFO_STORAGE_KEY = "alrijang:onboarding-brand-info";

// 온보딩 화면 필드 -> BrandProfile API 필드(../../../docs/api-spec.md) 매핑.
// oneLineIntro는 UI에서만 쓰는 소개 문구라 brandMood로 그대로 보낸다.
// blogId/naverId/blogIdConfirmed는 "채널 연결" 단계(BrandProfile 생성보다 먼저
// 일어남)에서 이미 받아온 값을 여기서 함께 실어 보낸다.
function toBrandProfileAnswers(brandInfo, { naverId, blogId, blogIdConfirmed }) {
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
    naverId: naverId ?? null,
    blogId: blogId ?? null,
    blogIdConfirmed,
  };
}

function BrandOnboarding() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // 네이버 로그인 관련 상태. naverId는 로그인된 신원, blogId/blogIdConfirmed는
  // (자동 후보 확인 또는 수동 입력으로) 사용자가 최종 확정한 값이다.
  const [naverId, setNaverId] = useState(null);
  const [blogId, setBlogId] = useState(null);
  const [blogIdConfirmed, setBlogIdConfirmed] = useState(false);
  const [candidate, setCandidate] = useState(null); // { blogId } — "맞나요?" 확인 대기 중
  const [suggestedBlogId, setSuggestedBlogId] = useState(null); // 확인 안 된 추정값, 수동 입력 폼 프리필용
  const [hasAttempted, setHasAttempted] = useState(false);
  const [authError, setAuthError] = useState(null);

  const brandProfileAnswers = useMemo(
    () => toBrandProfileAnswers(brandInfo, { naverId, blogId, blogIdConfirmed }),
    [brandInfo, naverId, blogId, blogIdConfirmed]
  );

  // 네이버 로그인은 페이지 전체 리다이렉트라 컴포넌트 상태가 초기화된다. 돌아왔을 때
  // 이 useEffect가 쿼리 파라미터(routes/auth.js가 실어 보냄)를 읽어 상태를 복원한다.
  const processedReturn = useRef(false);
  useEffect(() => {
    if (processedReturn.current) return;
    const returnedNaverId = searchParams.get("naverId");
    const returnedError = searchParams.get("naverAuthError");
    if (!returnedNaverId && !returnedError) return;

    processedReturn.current = true;

    const savedBrandInfo = sessionStorage.getItem(BRAND_INFO_STORAGE_KEY);
    if (savedBrandInfo) {
      setBrandInfo(JSON.parse(savedBrandInfo));
      sessionStorage.removeItem(BRAND_INFO_STORAGE_KEY);
    }
    setStepIndex(1);
    setHasAttempted(true);

    if (returnedError) {
      setAuthError(returnedError);
    } else {
      setNaverId(returnedNaverId);
      const returnedCandidate = searchParams.get("blogIdCandidate");
      const candidateExists = searchParams.get("candidateExists") === "true";
      if (candidateExists && returnedCandidate) {
        setCandidate({ blogId: returnedCandidate });
      } else if (returnedCandidate) {
        setSuggestedBlogId(returnedCandidate);
      }
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, TOTAL_STEPS - 1));
  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleComplete = () => {
    markOnboardingComplete();
    navigate("/");
  };

  const handleStartOAuth = () => {
    sessionStorage.setItem(BRAND_INFO_STORAGE_KEY, JSON.stringify(brandInfo));
    window.location.href = `${BASE_URL}/auth/naver`;
  };

  const handleConfirmCandidate = () => {
    setBlogId(candidate.blogId);
    setBlogIdConfirmed(true);
    setCandidate(null);
  };

  const handleRejectCandidate = () => {
    setSuggestedBlogId(candidate.blogId);
    setCandidate(null);
  };

  const handleConnectManual = (manualBlogId) => {
    setBlogId(manualBlogId);
    setBlogIdConfirmed(true);
    setCandidate(null);
    setSuggestedBlogId(null);
  };

  const handleDisconnect = () => {
    setNaverId(null);
    setBlogId(null);
    setBlogIdConfirmed(false);
    setCandidate(null);
    setSuggestedBlogId(null);
    setHasAttempted(false);
    setAuthError(null);
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
          connected={Boolean(blogId) && blogIdConfirmed}
          blogId={blogId}
          candidate={candidate}
          suggestedBlogId={suggestedBlogId}
          hasAttempted={hasAttempted}
          authError={authError}
          onStartOAuth={handleStartOAuth}
          onConfirmCandidate={handleConfirmCandidate}
          onRejectCandidate={handleRejectCandidate}
          onConnectManual={handleConnectManual}
          onDisconnect={handleDisconnect}
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
