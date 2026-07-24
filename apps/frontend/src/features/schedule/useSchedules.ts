import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { createSchedule, getDailySchedules, getSchedules } from "./scheduleApi";
import { CreateScheduleInput } from "./scheduleTypes";

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

export function useDailySchedules(storeId: string | null, workDate: string, enabled = true) {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  return useQuery({
    queryKey: ["schedules", storeId, workDate],
    queryFn: () => getDailySchedules(accessToken ?? "", storeId ?? "", workDate),
    enabled: Boolean(accessToken && storeId && workDate && enabled),
    retry: false
  });
}

export function useCreateSchedule(storeId: string | null) {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateScheduleInput) => createSchedule(accessToken ?? "", storeId ?? "", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["schedules"]
      });
    }
  });
}
