import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { useState } from "react";
import { AnalysisPage } from "./pages/AnalysisPage";
import { LandingPage } from "./pages/LandingPage";
import { SiteHeader } from "./components/SiteHeader";
import type { ReflectionDraft } from "./features/reflection/reflection";

type AppView = "landing" | "analysis";

export function App() {
  const [view, setView] = useState<AppView>("landing");
  const [analysisResult, setAnalysisResult] = useState<RepositoryAnalysisResult | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState<ReflectionDraft | null>(null);

  const showLanding = () => {
    setView("landing");
    setAnalysisResult(null);
    setReflectionDraft(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showAnalysis = (result: RepositoryAnalysisResult, draft: ReflectionDraft) => {
    setAnalysisResult(result);
    setReflectionDraft(draft);
    setView("analysis");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const showAnalyzer = () => {
    if (view !== "landing") {
      setView("landing");
      setAnalysisResult(null);
      setReflectionDraft(null);
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
        ) : analysisResult && reflectionDraft ? (
          <AnalysisPage
            result={analysisResult}
            reflectionDraft={reflectionDraft}
            onBackToLanding={showLanding}
          />
        ) : null}
      </main>
    </>
  );
}
