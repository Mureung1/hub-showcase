import { useEffect, useState } from "react";
import { loadIndustryTaxonomy, type IndustryTaxonomy } from "../../services/industryTaxonomy";

export function useIndustryTaxonomy(enabled: boolean) {
  const [data, setData] = useState<IndustryTaxonomy | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void loadIndustryTaxonomy(controller.signal).then(setData).catch(() => setData(null));
    return () => controller.abort();
  }, [enabled]);
  return data;
}
