import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { getPayrollSummary } from "./payrollApi";

export function usePayrollSummary(storeId: string | null, fromDate: string, toDate: string, enabled = true) {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  return useQuery({
    queryKey: ["payrollSummary", storeId, fromDate, toDate],
    queryFn: () => getPayrollSummary(accessToken ?? "", storeId ?? "", fromDate, toDate),
    enabled: Boolean(accessToken && storeId && fromDate && toDate && enabled),
    retry: false
  });
}
