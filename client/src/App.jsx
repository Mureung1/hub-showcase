import { Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SignupPage from "./pages/SignupPage";
import SignupFormPlaceholderPage from "./pages/SignupFormPlaceholderPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/signup/mentee" element={<SignupFormPlaceholderPage role="mentee" />} />
      <Route path="/signup/mentor" element={<SignupFormPlaceholderPage role="mentor" />} />
    </Routes>
  );
}

export default App;
