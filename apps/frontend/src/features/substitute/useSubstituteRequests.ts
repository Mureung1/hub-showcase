import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { createSubstituteRequest, getSubstituteRequests } from "./substituteApi";
import { CreateSubstituteRequestInput } from "./substituteTypes";

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
      await queryClient.invalidateQueries({
        queryKey: ["substituteRequests"]
      });
    }
  });
}
