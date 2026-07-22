import { useEffect } from "react";

type AnalysisUrlCleanupOptions = {
  hasInitialUrlState: boolean;
  period: string;
  availablePeriods: string[];
  defaultPeriod: string | null;
  onPeriodChange: (period: string) => void;
};

export function useAnalysisUrlCleanup({
  hasInitialUrlState,
  period,
  availablePeriods,
  defaultPeriod,
  onPeriodChange,
}: AnalysisUrlCleanupOptions) {
  useEffect(() => {
    if (!hasInitialUrlState) return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [hasInitialUrlState]);

  useEffect(() => {
    if (defaultPeriod && !availablePeriods.includes(period)) onPeriodChange(defaultPeriod);
  }, [availablePeriods, defaultPeriod, onPeriodChange, period]);
}
