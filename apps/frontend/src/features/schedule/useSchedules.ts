import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import {
  createRecurringSchedules,
  createSchedule,
  deleteSchedule,
  getDailySchedules,
  getSchedules,
  updateSchedule
} from "./scheduleApi";
import { CreateRecurringSchedulesInput, CreateScheduleInput, UpdateScheduleInput } from "./scheduleTypes";

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
      await queryClient.invalidateQueries({
        queryKey: ["payrollSummary"]
      });
    }
  });
}

export function useCreateRecurringSchedules(storeId: string | null) {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRecurringSchedulesInput) => createRecurringSchedules(accessToken ?? "", storeId ?? "", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["schedules"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["payrollSummary"]
      });
    }
  });
}

export function useUpdateSchedule() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { scheduleId: string; values: UpdateScheduleInput }) =>
      updateSchedule(accessToken ?? "", input.scheduleId, input.values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["schedules"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["payrollSummary"]
      });
    }
  });
}

export function useDeleteSchedule() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) => deleteSchedule(accessToken ?? "", scheduleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["schedules"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["payrollSummary"]
      });
    }
  });
}
