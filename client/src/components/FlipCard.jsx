import { useState } from 'react'

function FlipCard({ icon, title, value, onChange, reason }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className={`card${flipped ? ' flipped' : ''}`}>
      <div className="card-flip-inner">
        <div className="card-face card-face-front" inert={flipped || undefined}>
          <div className="card-head">
            <span className="icon" aria-hidden="true">{icon}</span>
            <span className="card-title">{title}</span>
            {reason && (
              <button className="why-btn" type="button" onClick={() => setFlipped(true)}>왜?</button>
            )}
          </div>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={title}
          />
        </div>
        <div className="card-face card-face-back" inert={!flipped || undefined}>
          <div className="card-head"><span className="card-title">왜 이렇게 정리했나요?</span></div>
          <p className="reason-text">{reason}</p>
          <button className="back-btn" type="button" onClick={() => setFlipped(false)}>다시 보기</button>
        </div>
      </div>
    </div>
  )
}

export default FlipCard
