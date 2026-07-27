import { apiRequest } from "../../shared/api";
import { PayrollSummary } from "./payrollTypes";

export async function getPayrollSummary(
  accessToken: string,
  storeId: string,
  fromDate: string,
  toDate: string
) {
  const params = new URLSearchParams({
    from: fromDate,
    to: toDate
  });

  return apiRequest<PayrollSummary>(`/stores/${storeId}/payroll/summary?${params.toString()}`, {
    accessToken
  });
}
