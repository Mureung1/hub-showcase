import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { useState } from "react";
import { AnalysisPage } from "./pages/AnalysisPage";
import { LandingPage } from "./pages/LandingPage";
import { SiteHeader } from "./components/SiteHeader";

type AppView = "landing" | "analysis";

export function App() {
  const [view, setView] = useState<AppView>("landing");
  const [analysisResult, setAnalysisResult] = useState<RepositoryAnalysisResult | null>(null);

  const showLanding = () => {
    setView("landing");
    setAnalysisResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showAnalysis = (result: RepositoryAnalysisResult) => {
    setAnalysisResult(result);
    setView("analysis");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const showAnalyzer = () => {
    if (view !== "landing") {
      setView("landing");
      setAnalysisResult(null);
    }

    window.requestAnimationFrame(() => {
      document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <>
      <SiteHeader onHome={showLanding} onOpenAnalyzer={showAnalyzer} />
      <main className="page ptop-container" id={view === "landing" ? "top" : "analysis"}>
        {view === "landing" ? (
          <LandingPage onAnalysisComplete={showAnalysis} />
        ) : analysisResult ? (
          <AnalysisPage result={analysisResult} onBackToLanding={showLanding} />
        ) : null}
      </main>
    </>
  );
}
