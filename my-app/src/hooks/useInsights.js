import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

// 서버는 health-score/opportunities가 별도 엔드포인트라, 프론트가 기대하는
// { healthScore, opportunities } 한 덩어리 모양으로 합쳐서 내려준다.
export function useInsights() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setIsLoading(true);
        setError(null);
        return Promise.all([apiClient.get("/insights/health-score"), apiClient.get("/insights/opportunities")]);
      })
      .then((result) => {
        if (!cancelled && result) {
          const [healthScore, opportunities] = result;
          setData({ healthScore, opportunities });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}
