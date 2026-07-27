import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { createSubstituteRequest } from "./substituteApi";
import { CreateSubstituteRequestInput } from "./substituteTypes";

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
