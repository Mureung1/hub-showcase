import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { getNotifications, markNotificationAsRead } from "./notificationApi";

export function useNotifications() {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(accessToken ?? ""),
    enabled: Boolean(accessToken),
    retry: false
  });
}

export function useMarkNotificationAsRead() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(accessToken ?? "", notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notifications"]
      });
    }
  });
}
