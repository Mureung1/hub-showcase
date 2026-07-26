import { Link } from "react-router-dom"
import { DIFFICULTY_META, toDifficultyTier } from "../constants/difficulty.js"

export default function NewsCard({ article }) {
  const { source, sourceInitial, headline, translation, tickers, url, readabilityScore } = article
  const difficulty = readabilityScore != null ? DIFFICULTY_META[toDifficultyTier(readabilityScore)] : null

  return (
    <Link className="news-card" to={`/reader?url=${encodeURIComponent(url)}`}>
      <div className="card-source">
        <span className="source-logo">{sourceInitial}</span>
        <span className="source-name">{source}</span>
        {difficulty && <span className={`badge ${difficulty.tone}`}>{difficulty.label}</span>}
      </div>
      <h2 className="card-headline">{headline}</h2>
      <p className="card-translation">{translation}</p>
      <div className="card-tickers">
        {tickers.map((ticker) => (
          <span className="ticker-badge" key={ticker}>
            {ticker}
          </span>
        ))}
      </div>
    </Link>
  )
}
