// 재료 카드(rounded-card border-2 border-ink bg-bg-surface)와 같은 카드 톤을 쓰고,
// 순서 배지만 CTA에 쓰는 primary 색으로 강조해 "몇 번째 단계인지"를 한눈에 보이게 한다.
function CookingSteps({ steps, twoColumn = false }) {
  if (!steps || steps.length === 0) return null

  return (
    <div className="rounded-card border-2 border-ink bg-bg-surface p-4">
      <h2 className="text-center font-display text-base font-bold text-text-primary">조리 순서</h2>
      <ol className={`mt-3 grid grid-cols-1 gap-4 ${twoColumn ? 'sm:grid-cols-2' : ''}`}>
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-primary font-display text-sm font-bold text-text-primary">
              {index + 1}
            </span>
            <p className="font-body text-sm leading-relaxed text-text-primary">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default CookingSteps
