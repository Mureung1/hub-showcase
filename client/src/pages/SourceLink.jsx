import { Link } from "react-router-dom"
import Button from "../components/Button"

/** Screen 4 — Original article thumbnail + external link. */
export default function SourceLink() {
  return (
    <div>
      <h1>Original Article</h1>
      <Link to="/sentences">
        <Button>Next</Button>
      </Link>
    </div>
  )
}
