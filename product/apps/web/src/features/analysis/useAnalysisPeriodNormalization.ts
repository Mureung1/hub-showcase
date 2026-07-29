import { useEffect } from "react";

type AnalysisPeriodNormalizationOptions = {
  period: string;
  availablePeriods: string[];
  defaultPeriod: string | null;
  onPeriodChange: (period: string) => void;
};

export function useAnalysisPeriodNormalization({
  period,
  availablePeriods,
  defaultPeriod,
  onPeriodChange,
}: AnalysisPeriodNormalizationOptions) {
  useEffect(() => {
    if (defaultPeriod && !availablePeriods.includes(period)) onPeriodChange(defaultPeriod);
  }, [availablePeriods, defaultPeriod, onPeriodChange, period]);
}
