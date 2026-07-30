import { useEffect, useMemo, useState } from "react";
import { hasSeenTour, markTourSeen } from "../utils/onboardingStorage";

function useOnboardingTour(tourId, steps, { enabled, userId, serverCompletedAt, serverTourKey }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const shouldRun = useMemo(
    () => Boolean(enabled) && Boolean(userId) && !hasSeenTour(tourId, userId, serverCompletedAt),
    // hasSeenTour는 enabled가 true로 바뀌는 시점에만 다시 확인하면 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, tourId, userId, serverCompletedAt],
  );

  useEffect(() => {
    setStepIndex(0);
    setIsFinished(false);
  }, [tourId]);

  const isActive = shouldRun && !isFinished && stepIndex < steps.length;
  const currentStep = isActive ? steps[stepIndex] : null;

  const finish = () => {
    markTourSeen(tourId, userId, serverTourKey);
    setIsFinished(true);
  };

  const next = () => {
    if (stepIndex >= steps.length - 1) {
      finish();
      return;
    }

    setStepIndex((currentIndex) => currentIndex + 1);
  };

  return {
    isActive,
    currentStep,
    stepIndex,
    totalSteps: steps.length,
    next,
  };
}

export default useOnboardingTour;
