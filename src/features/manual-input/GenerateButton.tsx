type GenerateButtonProps = {
  canGenerate: boolean
  isGenerating: boolean
  guide: string | null
  loadingMessage: string
  onGenerate: () => void
}

function GenerateButton({ canGenerate, isGenerating, guide, loadingMessage, onGenerate }: GenerateButtonProps) {
  return (
    <>
      <button className="generate-button" disabled={!canGenerate || isGenerating} onClick={onGenerate} type="button">
        {isGenerating ? '보낼 말을 만들고 있어요…' : '보낼 말 3가지 만들기'}
      </button>
      {guide && (
        <p className="generate-guide" role="status">
          {guide}
        </p>
      )}
      {isGenerating && (
        <>
          <p className="generation-status" role="status">
            {loadingMessage}
          </p>
          <div aria-label="보낼 말 후보를 준비하고 있어요" className="result-list generation-skeleton">
            {[1, 2, 3].map((skeletonIndex) => (
              <div className="generation-skeleton-card" key={skeletonIndex} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

export default GenerateButton
