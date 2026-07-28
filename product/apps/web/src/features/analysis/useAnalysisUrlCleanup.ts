import { useEffect } from "react";

type AnalysisUrlCleanupOptions = {
  hasInitialUrlState?: boolean;
  period: string;
  availablePeriods: string[];
  defaultPeriod: string | null;
  onPeriodChange: (period: string) => void;
};

export function useAnalysisUrlCleanup({
  period,
  availablePeriods,
  defaultPeriod,
  onPeriodChange,
}: AnalysisUrlCleanupOptions) {
  useEffect(() => {
    if (defaultPeriod && !availablePeriods.includes(period)) onPeriodChange(defaultPeriod);
  }, [availablePeriods, defaultPeriod, onPeriodChange, period]);
}
