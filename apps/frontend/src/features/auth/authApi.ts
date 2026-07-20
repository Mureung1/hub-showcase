import { apiRequest } from "../../shared/api";
import { CreateProfileResponse, CurrentUserResponse } from "./authTypes";

export async function createAuthProfile(accessToken: string, name: string) {
  return apiRequest<CreateProfileResponse>("/auth/profile", {
    method: "POST",
    accessToken,
    body: {
      name
    }
  });
}

export async function getCurrentUser(accessToken: string) {
  return apiRequest<CurrentUserResponse>("/me", {
    accessToken
  });
}
