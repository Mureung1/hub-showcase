import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { getSchedules } from "./scheduleApi";

export function useSchedules(storeId: string | null, fromDate: string, toDate: string, enabled = true) {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  return useQuery({
    queryKey: ["schedules", storeId, fromDate, toDate],
    queryFn: () => getSchedules(accessToken ?? "", storeId ?? "", fromDate, toDate),
    enabled: Boolean(accessToken && storeId && fromDate && toDate && enabled),
    retry: false
  });
}
