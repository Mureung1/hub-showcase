import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { getStores } from "./storeApi";

export function useStores() {
  const { session, user } = useAuth();
  const accessToken = session?.access_token;

  return useQuery({
    queryKey: ["stores", user?.id],
    queryFn: () => getStores(accessToken ?? ""),
    enabled: Boolean(accessToken),
    retry: false
  });
}
