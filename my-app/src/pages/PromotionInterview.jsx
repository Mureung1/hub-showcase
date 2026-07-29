import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import PageTopBar from "../components/PageTopBar";
import InfoTooltip from "../components/interview/InfoTooltip";
import ChoiceQuestion from "../components/interview/ChoiceQuestion";
import TextQuestion from "../components/interview/TextQuestion";
import PhotoQuestion from "../components/interview/PhotoQuestion";
import DateQuestion from "../components/interview/DateQuestion";
import DateRangeQuestion from "../components/interview/DateRangeQuestion";
import ReviewQuestion from "../components/interview/ReviewQuestion";

// design-reference/post_write.html(선택형 질문)과 WIREFRAME.md의 사진/텍스트/날짜
// 질문 유형 예시를 이어붙인 시나리오. 실제로는 백엔드 인터뷰 API가 선택지에 따라
// 다음 질문을 동적으로 내려주는 구조라(../../../docs/api-spec.md 참고), 지금은 3개 경로를
// 프론트에 하드코딩해두고 백엔드 연동 시점(Day8~9)에 API 응답으로 교체한다.
const PURPOSE_STEP = {
  id: "purpose",
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
};

const REVIEW_STEP = { id: "review", title: "답변을 확인해주세요", type: "review" };

const PHOTO_STEP = {
  id: "photo",
  title: "사진을 업로드해주세요",
  description: "사진을 분석하여 메뉴 특징과 분위기를 반영합니다.",
  type: "photo",
};

const STEPS_BY_PURPOSE = {
  "new-menu": [
    PURPOSE_STEP,
    {
      id: "menu-name",
      title: "신메뉴 이름을 알려주세요",
      type: "text",
      placeholder: "예: 아이스 아메리카노",
    },
    PHOTO_STEP,
    { id: "launch-date", title: "언제부터 판매하시나요?", type: "date" },
    REVIEW_STEP,
  ],
  event: [
    PURPOSE_STEP,
    {
      id: "event-name",
      title: "이벤트/할인 이름을 알려주세요",
      type: "text",
      placeholder: "예: 여름 시즌 빙수 20% 할인",
    },
    {
      id: "event-type",
      title: "어떤 이벤트인가요?",
      tooltip: "유형에 맞춰 AI가 홍보 문구 템플릿을 다르게 적용합니다.",
      type: "choice",
      options: [
        {
          value: "price-discount",
          icon: "percent",
          label: "가격 할인",
          description: "특정 메뉴나 전체 메뉴 가격을 %/정액으로 할인",
        },
        {
          value: "buy-one-get-one",
          icon: "card_giftcard",
          label: "1+1 · 증정",
          description: "하나를 사면 하나를 더 주거나 사은품을 증정",
        },
        {
          value: "coupon-point",
          icon: "loyalty",
          label: "쿠폰 · 적립 혜택",
          description: "쿠폰 발급이나 포인트 적립으로 혜택 제공",
        },
        {
          value: "bundle",
          icon: "inventory_2",
          label: "세트 · 묶음 할인",
          description: "여러 메뉴를 묶어서 할인된 가격에 제공",
        },
        {
          value: "seasonal",
          icon: "event",
          label: "시즌 이벤트",
          description: "할인 여부와 상관없이 계절/시즌에 맞춘 특별 이벤트",
        },
      ],
    },
    {
      id: "event-detail",
      title: "상세 내용을 알려주세요",
      type: "text",
      placeholder: "예: 아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상",
    },
    { id: "event-period", title: "진행 기간이 언제인가요?", type: "date-range" },
    PHOTO_STEP,
    REVIEW_STEP,
  ],
  general: [
    PURPOSE_STEP,
    {
      id: "general-topic",
      title: "무엇에 대한 이야기인가요?",
      type: "choice",
      options: [
        {
          value: "atmosphere",
          icon: "storefront",
          label: "매장 분위기 · 인테리어",
          description: "매장의 공간, 분위기, 디자인 등을 소개하고 싶을 때",
        },
        {
          value: "service",
          icon: "support_agent",
          label: "서비스 · 직원 소개",
          description: "친절한 서비스, 직원, 운영 철학을 알리고 싶을 때",
        },
        {
          value: "location",
          icon: "location_on",
          label: "위치 · 오시는 길",
          description: "매장 위치, 접근성, 주차 등을 안내하고 싶을 때",
        },
        {
          value: "brand-story",
          icon: "auto_stories",
          label: "브랜드 스토리",
          description: "가게를 시작한 계기나 브랜드 철학을 전하고 싶을 때",
        },
        {
          value: "etc",
          icon: "more_horiz",
          label: "기타",
          description: "위 항목에 해당하지 않는 소식을 자유롭게 전하고 싶을 때",
        },
      ],
    },
    {
      id: "general-detail",
      title: "하고 싶은 이야기를 자유롭게 적어주세요",
      type: "text",
      placeholder: "예: 이번에 매장 인테리어를 리뉴얼했어요",
    },
    PHOTO_STEP,
    REVIEW_STEP,
  ],
};

function isAnswered(step, answer) {
  if (step.type === "date-range") {
    return Boolean(answer?.start && answer?.end);
  }
  return Boolean(answer);
}

function PromotionInterview() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const purpose = answers.purpose;
  const steps = purpose ? STEPS_BY_PURPOSE[purpose] : [PURPOSE_STEP];
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const currentAnswer = answers[step.id];
  const canProceed = step.type === "review" || isAnswered(step, currentAnswer);

  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
  };

  const handleNext = async () => {
    if (isLast) {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const post = await apiClient.post("/posts/promotion", answers);
        if (photoFile) {
          try {
            await apiClient.uploadImage(`/posts/${post.id}/images`, photoFile);
          } catch {
            // 사진 업로드가 실패해도 글 자체는 이미 만들어졌으니 결과 화면으로는 계속 진행한다
          }
        }
        // photoFile도 함께 넘겨서, 결과 화면이 업로드 URL을 다시 불러오기 전
        // 잠깐이라도 사진을 바로 보여줄 수 있게 한다(업로드가 진짜 저장소이고,
        // 이건 그 사이 사용자 경험을 위한 보조 수단일 뿐).
        navigate(`/posts/promotion/result/${post.id}`, { state: { photoFile } });
      } catch (err) {
        setSubmitError(err.message);
        setIsSubmitting(false);
      }
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
      <PageTopBar
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
                  STEP {stepIndex + 1} / {steps.length}
                </span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-container transition-all duration-500 ease-out"
                  style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
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
              <PhotoQuestion
                value={currentAnswer}
                onChange={handleAnswerChange}
                onFileSelect={setPhotoFile}
              />
            )}
            {step.type === "date" && (
              <DateQuestion value={currentAnswer} onChange={handleAnswerChange} />
            )}
            {step.type === "date-range" && (
              <DateRangeQuestion value={currentAnswer} onChange={handleAnswerChange} />
            )}
            {step.type === "review" && <ReviewQuestion steps={steps} answers={answers} />}
            {submitError && (
              <p className="mt-md font-body-sm text-body-sm text-error">{submitError}</p>
            )}
          </div>

          <div className="px-xl py-lg bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isSubmitting}
              className="px-xl py-md rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              이전
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || isSubmitting}
              className="px-xl py-md bg-primary hover:bg-primary/90 text-white rounded-lg font-label-md text-label-md font-bold transition-all shadow-md shadow-primary/10 flex items-center gap-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLast ? (isSubmitting ? "생성 중..." : "홍보글 생성하기") : "다음"}
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
