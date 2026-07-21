import { UserRole } from "../../common/types/role";

export type CreateStoreInput = {
  ownerId: string;
  name: string;
  address?: string;
};

export type StoreRecord = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreMembershipWithStoreRecord = {
  role: UserRole;
  hourly_wage: number | null;
  default_work_start_time: string | null;
  default_work_end_time: string | null;
  joined_at: string;
  stores: StoreRecord;
};

export type UpdateStoreInput = {
  storeId: string;
  name?: string;
  address?: string | null;
};

export type CreateStoreWithOwnerRecord = {
  store_id: string;
  store_name: string;
  store_address: string | null;
  store_owner_id: string;
  store_created_at: string;
  store_updated_at: string;
  membership_id: string;
  membership_store_id: string;
  membership_user_id: string;
  membership_role: UserRole;
  membership_joined_at: string;
  membership_created_at: string;
  membership_updated_at: string;
};

export type StoreResponse = {
  id: string;
  name: string;
  address: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreMembershipResponse = {
  id: string;
  storeId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoreResponse = {
  store: StoreResponse;
  membership: StoreMembershipResponse;
};

export type StoreListItemResponse = StoreResponse & {
  role: UserRole;
  hourlyWage: number | null;
  defaultWorkStartTime: string | null;
  defaultWorkEndTime: string | null;
  joinedAt: string;
};

export type StoreListResponse = {
  stores: StoreListItemResponse[];
};
