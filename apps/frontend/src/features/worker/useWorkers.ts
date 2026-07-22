import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { getWorkers } from "./workerApi";

export function useWorkers(storeId: string | null, enabled = true) {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  return useQuery({
    queryKey: ["workers", storeId],
    queryFn: () => getWorkers(accessToken ?? "", storeId ?? ""),
    enabled: Boolean(accessToken && storeId && enabled),
    retry: false
  });
}
