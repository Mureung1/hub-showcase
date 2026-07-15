import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OpportunityAgentIntro from "./App.jsx";
import "./styles.css";
import "./profile.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <OpportunityAgentIntro />
  </StrictMode>,
);
