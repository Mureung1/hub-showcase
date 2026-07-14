import type { GenerationErrorCode } from '../../shared/generation'

const generationErrorMessage: Record<GenerationErrorCode, string> = {
  invalid_request: '입력 내용을 다시 확인해주세요.',
  rate_limited: '요청이 많아요. 잠시 후 다시 시도해주세요.',
  generation_failed: '보낼 말을 만들지 못했어요. 입력은 그대로 두었어요.',
  timeout: '응답이 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.',
  invalid_response: '안전하게 확인할 수 없는 응답이에요. 다시 시도해주세요.',
  unsafe_response: '안전하지 않은 표현이 감지됐어요. 상황을 조금 바꿔 다시 시도해주세요.',
}

type GenerationErrorNoticeProps = {
  error: GenerationErrorCode
  onRetry: () => void
}

function GenerationErrorNotice({ error, onRetry }: GenerationErrorNoticeProps) {
  return (
    <div className="generation-error" role="alert">
      <p>{generationErrorMessage[error]}</p>
      <button onClick={onRetry} type="button">
        다시 시도
      </button>
    </div>
  )
}

export default GenerationErrorNotice
