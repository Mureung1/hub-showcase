import { Link } from "react-router-dom"
import Button from "../components/Button"

/** Screen 2 — Briefing entry: stock tag, headline, source info. */
export default function BriefingEntry() {
  return (
    <div>
      <h1>Today&apos;s Briefing</h1>
      <Link to="/summary">
        <Button>Next</Button>
      </Link>
    </div>
  )
}
