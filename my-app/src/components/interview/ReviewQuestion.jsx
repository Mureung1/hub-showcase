function formatAnswer(step, answer) {
  if (!answer) return "-";
  if (step.type === "choice") {
    return step.options.find((o) => o.value === answer)?.label ?? answer;
  }
  return answer;
}

function ReviewQuestion({ steps, answers }) {
  const answeredSteps = steps.filter((step) => step.type !== "review");

  return (
    <div className="flex flex-col gap-xs">
      {answeredSteps.map((step) => (
        <div
          key={step.id}
          className="flex justify-between items-center py-sm border-b border-surface-variant"
        >
          <span className="text-body-sm text-on-surface-variant">{step.title}</span>
          <span className="text-body-sm font-semibold text-on-surface">
            {formatAnswer(step, answers[step.id])}
          </span>
        </div>
      ))}
    </div>
  );
}

export default ReviewQuestion;
