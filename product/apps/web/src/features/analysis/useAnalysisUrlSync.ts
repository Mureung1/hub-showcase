import { useEffect, useState } from "react";

import { writeAnalysisUrlState, type AnalysisUrlState } from "./analysisUrlState";

type AnalysisUrlSyncOptions = {
  initialEnabled: boolean;
  state: AnalysisUrlState;
  availablePeriods: string[];
  defaultPeriod: string | null;
  onPeriodChange: (period: string) => void;
};

export function useAnalysisUrlSync({
  initialEnabled,
  state,
  availablePeriods,
  defaultPeriod,
  onPeriodChange,
}: AnalysisUrlSyncOptions) {
  const [enabled, setEnabled] = useState(initialEnabled);

  useEffect(() => {
    if (enabled) writeAnalysisUrlState(state);
  }, [enabled, state]);

  useEffect(() => {
    if (defaultPeriod && !availablePeriods.includes(state.period)) {
      onPeriodChange(defaultPeriod);
    }
  }, [availablePeriods, defaultPeriod, onPeriodChange, state.period]);

  return {
    enableUrlSync: () => setEnabled(true),
    resetUrl: () => {
      setEnabled(false);
      window.history.replaceState(window.history.state, "", window.location.pathname);
    },
  };
}
