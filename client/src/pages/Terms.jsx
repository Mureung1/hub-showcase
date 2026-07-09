import { Link } from "react-router-dom"
import Button from "../components/Button"

/** Screen 6 — Investment-term mini glossary. */
export default function Terms() {
  return (
    <div>
      <h1>Today&apos;s Investment Concepts</h1>
      <Link to="/">
        <Button>Finish Today&apos;s Lesson</Button>
      </Link>
    </div>
  )
}
