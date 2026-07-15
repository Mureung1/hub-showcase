import { AuthUser } from "../../common/types/auth";
import { createProfile, findProfileById } from "./auth.repository";
import { ProfileRecord, ProfileResponse } from "./auth.types";

function toProfileResponse(profile: ProfileRecord): ProfileResponse {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  };
}

export async function ensureProfile(authUser: AuthUser, name: string) {
  const existingProfile = await findProfileById(authUser.id);

  if (existingProfile) {
    return toProfileResponse(existingProfile);
  }

  const profile = await createProfile({
    userId: authUser.id,
    email: authUser.email,
    name
  });

  return toProfileResponse(profile);
}
