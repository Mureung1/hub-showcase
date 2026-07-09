import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import BriefingEntry from "./pages/BriefingEntry"
import Summary from "./pages/Summary"
import SourceLink from "./pages/SourceLink"
import Sentences from "./pages/Sentences"
import Terms from "./pages/Terms"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/entry" element={<BriefingEntry />} />
      <Route path="/summary" element={<Summary />} />
      <Route path="/source" element={<SourceLink />} />
      <Route path="/sentences" element={<Sentences />} />
      <Route path="/terms" element={<Terms />} />
    </Routes>
  )
}

export default App
