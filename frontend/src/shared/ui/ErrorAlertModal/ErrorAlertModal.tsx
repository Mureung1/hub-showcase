import mascotDefault from '../../../assets/mascot/mascot-default&complete.png'
import './ErrorAlertModal.css'

type ErrorAlertModalProps = {
  onRetry: () => void
}

export default function ErrorAlertModal({ onRetry }: ErrorAlertModalProps) {
  return (
    <div className="error-alert-backdrop">
      <section
        className="error-alert-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-alert-title"
        aria-describedby="error-alert-description"
      >
        <img className="error-alert-mascot" src={mascotDefault} alt="" />
        <h2 id="error-alert-title">잠시 문제가 생겼어요</h2>
        <p id="error-alert-description">
          콘텐츠를 불러오지 못했어요.{' '}
          <br />
          잠시 후 다시 시도해 주세요.
        </p>
        <button type="button" className="btn-primary" onClick={onRetry}>
          다시 시도
        </button>
      </section>
    </div>
  )
}
