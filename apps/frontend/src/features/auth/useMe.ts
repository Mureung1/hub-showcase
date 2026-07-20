import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "./authApi";
import { useAuth } from "./AuthProvider";

export function useMe() {
  const { session, user } = useAuth();
  const accessToken = session?.access_token;

  return useQuery({
    queryKey: ["me", user?.id],
    queryFn: () => getCurrentUser(accessToken ?? ""),
    enabled: Boolean(accessToken),
    retry: false
  });
}
