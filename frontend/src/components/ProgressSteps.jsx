// 지금 몇 단계에 있고 앞으로 뭐가 남았는지 보여준다.
// 입력이 세 걸음으로 나뉘어 있어서, 표시가 없으면 "아직 얼마나 더 물어보나" 를 알 수 없다.
const STEPS = [
  { key: "collect", label: "과목 담기" },
  { key: "understanding", label: "이해도" },
  { key: "result", label: "결과" },
];

function ProgressSteps({ current }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <ol className="progress-steps">
      {STEPS.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";

        return (
          <li
            key={step.key}
            className={`progress-step is-${state}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="progress-step-num" aria-hidden="true">
              {index + 1}
            </span>
            <span className="progress-step-label">{step.label}</span>
            {/* 완료·현재 여부를 색으로만 알리지 않도록 글자로도 남긴다. */}
            <span className="sr-only">
              {state === "done" ? "완료" : state === "current" ? "현재 단계" : "남음"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default ProgressSteps;
