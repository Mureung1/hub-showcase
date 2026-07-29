import { useEffect, useState } from "react";
import { listAnonymousEmotionAnalyses } from "../storage/anonymousEmotionStore";

export default function useEmotionHistory() {
  const [records, setRecords] = useState(null);
  const [isLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setRecords(listAnonymousEmotionAnalyses());
    } catch {
      setError("");
      setRecords([]);
    }
  }, []);

  return { records, isLoading, error };
}
