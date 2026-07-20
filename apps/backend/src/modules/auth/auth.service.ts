import { AuthUser } from "../../common/types/auth";
import { createProfile, findProfileById, findStoreMembershipsByUserId } from "./auth.repository";
import {
  CurrentUserResponse,
  CurrentUserStoreResponse,
  ProfileRecord,
  ProfileResponse,
  StoreMembershipRecord
} from "./auth.types";

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

function toCurrentUserStoreResponse(membership: StoreMembershipRecord): CurrentUserStoreResponse {
  return {
    id: membership.stores.id,
    name: membership.stores.name,
    address: membership.stores.address,
    role: membership.role,
    hourlyWage: membership.hourly_wage,
    defaultWorkStartTime: membership.default_work_start_time,
    defaultWorkEndTime: membership.default_work_end_time,
    joinedAt: membership.joined_at
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

export async function getCurrentUser(authUser: AuthUser): Promise<CurrentUserResponse | null> {
  const profile = await findProfileById(authUser.id);

  if (!profile) {
    return null;
  }

  const memberships = await findStoreMembershipsByUserId(authUser.id);

  return {
    profile: toProfileResponse(profile),
    stores: memberships.map(toCurrentUserStoreResponse)
  };
}
