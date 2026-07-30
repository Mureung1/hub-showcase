import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function getTargetRect(selector) {
  const target = document.querySelector(selector);
  if (!target) return null;

  return target.getBoundingClientRect();
}

function OnboardingCoachMark({ step, stepIndex, totalSteps, onNext }) {
  // undefined = 아직 DOM에서 확인하기 전, null = 확인했지만 타깃이 없음.
  // 최초 렌더 시점에는 타깃이 아직 커밋되지 않았을 수 있으므로 여기서 바로
  // document.querySelector를 호출하지 않고, 커밋 이후 실행되는
  // useLayoutEffect에서만 실제 존재 여부를 확인한다.
  const [rect, setRect] = useState(undefined);
  const nextButtonRef = useRef(null);

  useLayoutEffect(() => {
    setRect(getTargetRect(step.target));
  }, [step.target]);

  useEffect(() => {
    if (rect === undefined) return undefined;

    if (rect === null) {
      // 타깃 요소가 화면에 없는 스텝은 건너뛴다.
      onNext();
      return undefined;
    }

    const recalculate = () => setRect(getTargetRect(step.target));

    window.addEventListener("scroll", recalculate, true);
    window.addEventListener("resize", recalculate);

    return () => {
      window.removeEventListener("scroll", recalculate, true);
      window.removeEventListener("resize", recalculate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect, step.target]);

  useEffect(() => {
    nextButtonRef.current?.focus();
  }, [step.target]);

  if (!rect) return null;

  const isLastStep = stepIndex >= totalSteps - 1;
  const bubbleTop = step.placement === "top"
    ? rect.top - 12
    : rect.bottom + 12;

  return createPortal(
    <div className="onboarding-overlay" role="presentation">
      <div
        className="onboarding-highlight"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />
      <div
        aria-modal="true"
        className={`onboarding-bubble onboarding-bubble-${step.placement}`}
        role="dialog"
        style={{
          top: bubbleTop,
          left: Math.max(12, rect.left),
          transform: step.placement === "top" ? "translateY(-100%)" : "none",
        }}
      >
        <p className="onboarding-bubble-message">{step.message}</p>
        <div className="onboarding-bubble-footer">
          <span className="onboarding-bubble-progress">{stepIndex + 1} / {totalSteps}</span>
          <button
            className="button button-primary onboarding-next-button"
            onClick={onNext}
            ref={nextButtonRef}
            type="button"
          >
            {isLastStep ? "확인" : "다음"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default OnboardingCoachMark;
