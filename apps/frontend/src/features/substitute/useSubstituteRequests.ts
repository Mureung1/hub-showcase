import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import {
  applySubstituteRequest,
  approveSubstituteRequest,
  createSubstituteRequest,
  getSubstituteRequests,
  rejectSubstituteRequest
} from "./substituteApi";
import { CreateSubstituteRequestInput, RejectSubstituteRequestInput } from "./substituteTypes";

export function useSubstituteRequests(storeId: string | null) {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  return useQuery({
    queryKey: ["substituteRequests", storeId],
    queryFn: () => getSubstituteRequests(accessToken ?? "", storeId ?? ""),
    enabled: Boolean(accessToken && storeId),
    retry: false
  });
}

export function useCreateSubstituteRequest(storeId: string | null) {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSubstituteRequestInput) =>
      createSubstituteRequest(accessToken ?? "", storeId ?? "", input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["substituteRequests"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["notifications"]
        })
      ]);
    }
  });
}

export function useApplySubstituteRequest() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => applySubstituteRequest(accessToken ?? "", requestId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["substituteRequests"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["notifications"]
        })
      ]);
    }
  });
}

export function useApproveSubstituteRequest() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => approveSubstituteRequest(accessToken ?? "", requestId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["substituteRequests"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["schedules"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["payrollSummary"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["notifications"]
        })
      ]);
    }
  });
}

export function useRejectSubstituteRequest() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { requestId: string; values: RejectSubstituteRequestInput }) =>
      rejectSubstituteRequest(accessToken ?? "", input.requestId, input.values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["substituteRequests"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["notifications"]
        })
      ]);
    }
  });
}
