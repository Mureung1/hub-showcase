type ReflectionQuestionBubbleProps = {
  question: string;
  className?: string;
};

export function ReflectionQuestionBubble({
  question,
  className = "",
}: ReflectionQuestionBubbleProps) {
  return (
    <div
      className={`border border-ptop-landing-green bg-ptop-landing-lavender p-3 font-mono text-xs leading-[1.6] text-[#41484d] sm:p-4 sm:text-sm ${className}`}
      aria-label="Poppy 회고 질문 예시"
    >
      <p className="m-0">“{question}”</p>
      <span
        className="mt-3 block h-1.5 w-1.5 bg-ptop-landing-lime"
        aria-hidden="true"
      />
    </div>
  );
}
