import { Link } from "react-router-dom"
import Button from "../components/Button"

/** Screen 3 — 3-line Korean summary + key metrics. */
export default function Summary() {
  return (
    <div>
      <h1>Key Summary</h1>
      <Link to="/source">
        <Button>Read Original →</Button>
      </Link>
    </div>
  )
}
