import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function useWorkspacePanels(compactMap: boolean, restoreSceneFocus: boolean) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(() => !compactMap);
  const [inspectorOpen, setInspectorOpen] = useState(() => !compactMap);
  const filterOpenButtonRef = useRef<HTMLButtonElement>(null);
  const inspectorOpenButtonRef = useRef<HTMLButtonElement>(null);
  const sceneOpenButtonRef = useRef<HTMLButtonElement>(null);
  const sceneWasOpenRef = useRef(false);
  const activeDialog = evidenceOpen
    ? "evidence"
    : reportOpen
      ? "report"
      : compareOpen
        ? "compare"
        : null;

  useEffect(() => {
    if (!activeDialog) return;
    const returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const close = () => {
      if (activeDialog === "evidence") setEvidenceOpen(false);
      if (activeDialog === "report") setReportOpen(false);
      if (activeDialog === "compare") setCompareOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    const focusTimer = window.setTimeout(() => {
      document.querySelector<HTMLElement>("[role='dialog'] .modal-close")?.focus();
    });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => returnFocus?.focus());
    };
  }, [activeDialog]);

  useEffect(() => {
    if (!filtersOpen) filterOpenButtonRef.current?.focus();
  }, [filtersOpen]);

  useEffect(() => {
    if (!inspectorOpen) inspectorOpenButtonRef.current?.focus();
  }, [inspectorOpen]);

  useLayoutEffect(() => {
    const didCloseScene = sceneWasOpenRef.current && !sceneOpen;
    sceneWasOpenRef.current = sceneOpen;
    if (restoreSceneFocus && didCloseScene) sceneOpenButtonRef.current?.focus();
  }, [restoreSceneFocus, sceneOpen]);

  return {
    evidenceOpen,
    setEvidenceOpen,
    reportOpen,
    setReportOpen,
    compareOpen,
    setCompareOpen,
    sceneOpen,
    setSceneOpen,
    filtersOpen,
    setFiltersOpen,
    inspectorOpen,
    setInspectorOpen,
    filterOpenButtonRef,
    inspectorOpenButtonRef,
    sceneOpenButtonRef,
    restoreSceneFocus,
  };
}
