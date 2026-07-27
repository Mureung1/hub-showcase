import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { useState } from "react";
import { AnalysisPage } from "./pages/AnalysisPage";
import { LandingPage } from "./pages/LandingPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { SiteHeader } from "./components/SiteHeader";
import type { ReflectionDraft } from "./features/reflection/reflection";

type AppView = "landing" | "workspace" | "analysis";

function getInitialView(): AppView {
  const preview = new URLSearchParams(window.location.search).get("preview");
  return import.meta.env.DEV && preview === "workspace" ? "workspace" : "landing";
}

export function App() {
  const [view, setView] = useState<AppView>(getInitialView);
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

  const showWorkspace = () => {
    setView("workspace");
    setAnalysisResult(null);
    setReflectionDraft(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <>
      {view !== "workspace" && (
        <SiteHeader
          variant={view === "landing" ? "overlay" : "default"}
          onHome={showLanding}
          onOpenWorkspace={showWorkspace}
        />
      )}
      <main
        className={
          view === "workspace"
            ? "min-h-screen bg-ptop-mint-soft"
            : view === "landing"
              ? "min-h-screen"
              : "ptop-container py-12"
        }
        id={view}
      >
        {view === "landing" ? (
          <LandingPage onEnterWorkspace={showWorkspace} />
        ) : view === "workspace" ? (
          <WorkspacePage
            onBackToLanding={showLanding}
            onAnalysisComplete={showAnalysis}
          />
        ) : analysisResult && reflectionDraft ? (
          <AnalysisPage
            result={analysisResult}
            reflectionDraft={reflectionDraft}
            onBackToWorkspace={showWorkspace}
          />
        ) : null}
      </main>
    </>
  );
}
