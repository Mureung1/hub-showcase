import { apiRequest } from "../../shared/api";
import { CreateProfileResponse } from "./authTypes";

export async function createAuthProfile(accessToken: string, name: string) {
  return apiRequest<CreateProfileResponse>("/auth/profile", {
    method: "POST",
    accessToken,
    body: {
      name
    }
  });
}
