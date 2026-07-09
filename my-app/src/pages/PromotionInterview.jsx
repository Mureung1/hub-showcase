import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InterviewTopBar from "../components/interview/InterviewTopBar";
import InfoTooltip from "../components/interview/InfoTooltip";
import ChoiceQuestion from "../components/interview/ChoiceQuestion";
import TextQuestion from "../components/interview/TextQuestion";
import PhotoQuestion from "../components/interview/PhotoQuestion";
import DateQuestion from "../components/interview/DateQuestion";
import ReviewQuestion from "../components/interview/ReviewQuestion";

const TOTAL_STEPS = 5;

// "신메뉴" 홍보 경로 예시. design-reference/post_write.html(선택형 질문)과
// WIREFRAME.md의 사진/텍스트/날짜 질문 유형 예시를 이어붙인 시나리오.
// TODO: "이벤트/할인", "일반 홍보"를 선택했을 때는 이후 질문이 달라져야 함.
// 실제로는 백엔드 인터뷰 API가 선택지에 따라 다음 질문을 동적으로 내려주는
// 구조라(docs/api-spec.md 참고), 지금 프론트에 3개 경로를 전부 하드코딩하는
// 대신 백엔드 연동 시점으로 미룸.
const STEPS = [
  {
    id: "purpose",
    number: 1,
    title: "무엇을 홍보하시나요?",
    tooltip: "홍보 목적에 따라 AI가 질문과 SEO 전략을 다르게 생성합니다.",
    type: "choice",
    options: [
      {
        value: "new-menu",
        icon: "restaurant_menu",
        label: "신메뉴",
        description: "새롭게 출시된 메뉴나 상품을 소개하고 싶을 때",
      },
      {
        value: "event",
        icon: "celebration",
        label: "이벤트 / 할인",
        description: "기간 한정 프로모션, 쿠폰, 특별 행사를 홍보할 때",
      },
      {
        value: "general",
        icon: "campaign",
        label: "일반 홍보",
        description: "매장의 분위기, 서비스, 위치 등 전반적인 소식을 알릴 때",
      },
    ],
  },
  {
    id: "menu-name",
    number: 2,
    title: "신메뉴 이름을 알려주세요",
    type: "text",
    placeholder: "예: 아이스 아메리카노",
  },
  {
    id: "photo",
    number: 3,
    title: "사진을 업로드해주세요",
    description: "사진을 분석하여 메뉴 특징과 분위기를 반영합니다.",
    type: "photo",
  },
  {
    id: "launch-date",
    number: 4,
    title: "언제부터 판매하시나요?",
    type: "date",
  },
  {
    id: "review",
    number: 5,
    title: "답변을 확인해주세요",
    type: "review",
  },
];

function PromotionInterview() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const currentAnswer = answers[step.id];
  const canProceed = step.type === "review" || Boolean(currentAnswer);

  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
  };

  const handleNext = () => {
    if (isLast) {
      // TODO: 콘텐츠 생성 결과 화면(WIREFRAME.md 3번)으로 연결
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const handlePrev = () => {
    if (isFirst) {
      navigate("/");
      return;
    }
    setStepIndex((i) => i - 1);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <InterviewTopBar
        storeName="OO카페"
        title="AI와 함께 홍보글 작성"
        onBack={handlePrev}
      />

      <main className="flex-1 pt-24 pb-12 flex items-center justify-center px-gutter">
        <div className="w-full max-w-[750px] bg-surface-container-lowest rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden flex flex-col">
          <div className="p-xl text-center flex flex-col items-center">
            <div className="relative mb-md">
              <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[32px]">
                  smart_toy
                </span>
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-secondary-fixed-dim border-2 border-white rounded-full" />
            </div>

            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-xs">
              브랜드에 맞는 홍보글을 함께 만들어볼게요.
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-[480px]">
              몇 가지 질문만 답변해주시면 AI가 최적의 홍보글을 작성해드립니다.
            </p>

            <div className="mt-xl w-full max-w-[400px]">
              <div className="flex justify-between items-end mb-xs">
                <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider">
                  Interview Process
                </span>
                <span className="font-label-md text-label-md text-on-surface font-bold">
                  STEP {step.number} / {TOTAL_STEPS}
                </span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-container transition-all duration-500 ease-out"
                  style={{ width: `${(step.number / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="px-xl pb-xl flex-1">
            <div className="flex items-center gap-xs mb-lg">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {step.title}
              </h3>
              {step.tooltip && <InfoTooltip text={step.tooltip} />}
            </div>
            {step.description && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
                {step.description}
              </p>
            )}

            {step.type === "choice" && (
              <ChoiceQuestion
                options={step.options}
                value={currentAnswer}
                onChange={handleAnswerChange}
              />
            )}
            {step.type === "text" && (
              <TextQuestion
                value={currentAnswer}
                onChange={handleAnswerChange}
                placeholder={step.placeholder}
              />
            )}
            {step.type === "photo" && (
              <PhotoQuestion value={currentAnswer} onChange={handleAnswerChange} />
            )}
            {step.type === "date" && (
              <DateQuestion value={currentAnswer} onChange={handleAnswerChange} />
            )}
            {step.type === "review" && <ReviewQuestion steps={STEPS} answers={answers} />}
          </div>

          <div className="px-xl py-lg bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              className="px-xl py-md rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              이전
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
              className="px-xl py-md bg-primary hover:bg-primary/90 text-white rounded-lg font-label-md text-label-md font-bold transition-all shadow-md shadow-primary/10 flex items-center gap-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLast ? "홍보글 생성하기" : "다음"}
              {!isLast && (
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PromotionInterview;
