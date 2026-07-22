import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { getPendingInvitations } from "./invitationApi";

export function usePendingInvitations() {
  const { session, user } = useAuth();
  const accessToken = session?.access_token;

  return useQuery({
    queryKey: ["pendingInvitations", user?.id],
    queryFn: () => getPendingInvitations(accessToken ?? ""),
    enabled: Boolean(accessToken),
    retry: false
  });
}
