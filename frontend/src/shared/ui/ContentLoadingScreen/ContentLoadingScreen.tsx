import mascotLoading from '../../../assets/mascot/mascot-loading.png'
import './ContentLoadingScreen.css'

type ContentLoadingScreenProps = {
  message: string
  description?: string
}

export default function ContentLoadingScreen({ message, description }: ContentLoadingScreenProps) {
  return (
    <div className="content-loading" role="status">
      <div className="content-loading-spinner">
        <svg
          className="content-loading-ring"
          viewBox="0 0 132 132"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="66" cy="66" r="58" fill="none" stroke="var(--rule)" strokeWidth="7" />
          <path
            d="M66 8a58 58 0 0 1 58 58"
            fill="none"
            stroke="var(--brand)"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
        <img
          className="content-loading-mascot"
          src={mascotLoading}
          alt=""
          aria-hidden="true"
        />
      </div>

      <p className="content-loading-message">{message}</p>
      {description && <p className="content-loading-description">{description}</p>}

      <span className="content-loading-dots" aria-hidden="true">
        <span className="content-loading-dot" />
        <span className="content-loading-dot" />
        <span className="content-loading-dot" />
      </span>
    </div>
  )
}
