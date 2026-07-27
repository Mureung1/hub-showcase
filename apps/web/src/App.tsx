import type { RepositoryAnalysisResult } from "@ptop/contracts";
import { useState } from "react";
import { AnalysisPage } from "./pages/AnalysisPage";
import { LandingPage } from "./pages/LandingPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { SiteHeader } from "./components/SiteHeader";
import type { ReflectionDraft } from "./features/reflection/reflection";

type AppView = "landing" | "workspace" | "analysis";

type InitialRoute = {
  view: AppView;
  openAnalysisOnEntry: boolean;
};

function getInitialRoute(): InitialRoute {
  const searchParams = new URLSearchParams(window.location.search);
  const preview = searchParams.get("preview");
  const requestedView = searchParams.get("view");

  if (import.meta.env.DEV && preview === "workspace") {
    return { view: "workspace", openAnalysisOnEntry: false };
  }

  return requestedView === "workspace"
    ? { view: "workspace", openAnalysisOnEntry: searchParams.get("start") === "analysis" }
    : { view: "landing", openAnalysisOnEntry: false };
}

export function App() {
  const [initialRoute] = useState(getInitialRoute);
  const [view, setView] = useState<AppView>(initialRoute.view);
  const [openAnalysisOnEntry, setOpenAnalysisOnEntry] = useState(initialRoute.openAnalysisOnEntry);
  const [analysisResult, setAnalysisResult] = useState<RepositoryAnalysisResult | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState<ReflectionDraft | null>(null);

  const showLanding = () => {
    setView("landing");
    setAnalysisResult(null);
    setReflectionDraft(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.delete("start");
    window.history.replaceState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showAnalysis = (result: RepositoryAnalysisResult, draft: ReflectionDraft) => {
    setAnalysisResult(result);
    setReflectionDraft(draft);
    setOpenAnalysisOnEntry(false);
    setView("analysis");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const showWorkspace = ({ openAnalysis = false }: { openAnalysis?: boolean } = {}) => {
    setView("workspace");
    setOpenAnalysisOnEntry(openAnalysis);
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
          onOpenAnalysis={() => showWorkspace({ openAnalysis: true })}
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
          <LandingPage onEnterWorkspace={() => showWorkspace({ openAnalysis: true })} />
        ) : view === "workspace" ? (
          <WorkspacePage
            onBackToLanding={showLanding}
            onAnalysisComplete={showAnalysis}
            openAnalysisOnEntry={openAnalysisOnEntry}
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
