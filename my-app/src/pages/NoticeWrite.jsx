import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopBar from "../components/PageTopBar";
import InfoTooltip from "../components/interview/InfoTooltip";
import NoticeTypeChoice from "../components/notice-write/NoticeTypeChoice";
import NoticeContentQuestion from "../components/notice-write/NoticeContentQuestion";

// design-reference/notice_write1.html은 "STEP 1/3"까지만 보여준다.
// 3단계는 인터뷰 안의 별도 스텝이 아니라 notice_write2.html(생성 결과 화면) 자체를
// 가리키는 것으로 해석해서, 인터뷰는 2스텝(유형 선택 → 내용 입력)으로 구성하고
// 진행률 분모만 3으로 맞췄다.
const TOTAL_STAGES = 3;

const STEPS = [
  {
    id: "type",
    number: 1,
    stageLabel: "시작 단계",
    title: "어떤 공지를 작성하시나요?",
    tooltip: "공지의 주제를 선택하면 최적화된 템플릿을 제안합니다.",
    type: "choice",
    options: [
      {
        value: "day-off",
        emoji: "🏖",
        label: "휴무 안내",
        description: "정기 휴무, 임시 휴업 등 일정을 안내합니다.",
      },
      {
        value: "hours-change",
        emoji: "⏰",
        label: "영업시간 변경",
        description: "오픈/마감 시간 변경 및 브레이크 타임을 안내합니다.",
      },
      {
        value: "sold-out",
        emoji: "❌",
        label: "품절 안내",
        description: "인기 메뉴의 조기 소진이나 재료 수급 문제를 안내합니다.",
      },
      {
        value: "etc",
        emoji: "📢",
        label: "기타 공지",
        description: "이벤트, 신메뉴 출시 등 그 외 소식을 자유롭게 작성합니다.",
      },
    ],
  },
  {
    id: "content",
    number: 2,
    stageLabel: "내용 작성",
    title: "공지 내용을 자유롭게 적어주세요",
    tooltip: "입력하신 내용을 바탕으로 AI가 정중한 톤의 공지문으로 다듬어드립니다.",
    type: "content",
    placeholder: "예: 7월 20일은 내부 시설 점검으로 임시 휴무입니다.",
  },
];

function NoticeWrite() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const currentAnswer = answers[step.id];
  const canProceed = Boolean(currentAnswer);

  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
  };

  const handleNext = () => {
    if (isLast) {
      navigate("/posts/notice/result");
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
        title="AI와 함께 공지사항 작성"
        onBack={handlePrev}
      />

      <main className="flex-1 pt-24 pb-12 flex items-center justify-center px-gutter">
        <div className="w-full max-w-[750px] bg-surface-container-lowest rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden flex flex-col">
          <div className="p-xl bg-gradient-to-br from-primary-fixed to-surface-container-lowest border-b border-outline-variant/30 flex flex-col items-center text-center">
            <div className="relative mb-md">
              <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center shadow-md">
                <span
                  className="material-symbols-outlined text-on-primary-container text-[40px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  smart_toy
                </span>
              </div>
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-secondary border-4 border-surface-container-lowest rounded-full" />
            </div>

            <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">
              간단한 질문만 답변해주시면
              <br />
              공지사항을 자연스럽게 작성해드릴게요.
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              1분 안에 공지사항을 완성할 수 있습니다.
            </p>
          </div>

          <div className="px-xl py-lg">
            <div className="flex justify-between items-center mb-xs">
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider">
                Step {step.number} / {TOTAL_STAGES}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {step.stageLabel}
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(step.number / TOTAL_STAGES) * 100}%` }}
              />
            </div>
          </div>

          <div className="px-xl pb-xl flex-1">
            <div className="flex items-center gap-xs mb-lg">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {step.title}
              </h3>
              {step.tooltip && <InfoTooltip text={step.tooltip} />}
            </div>

            {step.type === "choice" && (
              <NoticeTypeChoice
                options={step.options}
                value={currentAnswer}
                onChange={handleAnswerChange}
              />
            )}
            {step.type === "content" && (
              <NoticeContentQuestion
                value={currentAnswer}
                onChange={handleAnswerChange}
                placeholder={step.placeholder}
              />
            )}
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
              {isLast ? "공지 생성하기" : "다음"}
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

export default NoticeWrite;
