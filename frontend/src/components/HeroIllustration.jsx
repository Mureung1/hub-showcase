function CommitNode({ cx, cy, r, delay }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="url(#nodeGradient)"
      className="commit-node"
      style={{ animationDelay: `${delay}s` }}
    />
  )
}

function HeroIllustration() {
  return (
    <div className="hero-art">
      <svg viewBox="0 0 480 300" className="hero-svg" role="presentation" aria-hidden="true">
        <defs>
          <linearGradient id="nodeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>

        <path
          d="M40 210 C 90 210, 90 130, 140 130 S 190 60, 240 60"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="6 8"
        />
        <path
          d="M40 210 C 80 210, 100 240, 150 240 S 200 200, 240 200"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="6 8"
        />
        <path d="M240 60 L 320 150 M240 200 L 320 150" stroke="url(#lineGradient)" strokeWidth="3" fill="none" />

        <CommitNode cx={40} cy={210} r={9} delay={0} />
        <CommitNode cx={140} cy={130} r={7} delay={0.2} />
        <CommitNode cx={150} cy={240} r={7} delay={0.4} />
        <CommitNode cx={240} cy={60} r={8} delay={0.6} />
        <CommitNode cx={240} cy={200} r={8} delay={0.8} />

        <g className="match-star">
          <circle cx={320} cy={150} r="34" fill="url(#starGlow)" opacity="0.25" />
          <path
            d="M320 128l6.5 15.3L342 146l-13 10.5L332 173l-12-9.4-12 9.4 3-16.5-13-10.5 15.5-2.7z"
            fill="url(#starGlow)"
          />
        </g>
      </svg>

      <span className="floating-chip chip-1">React</span>
      <span className="floating-chip chip-2">Python</span>
      <span className="floating-chip chip-3">good first issue</span>
    </div>
  )
}

export default HeroIllustration
