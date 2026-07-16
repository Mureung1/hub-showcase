import { createStoreWithOwner } from "./stores.repository";
import { CreateStoreInput, CreateStoreResponse, CreateStoreWithOwnerRecord } from "./stores.types";

function toCreateStoreResponse(record: CreateStoreWithOwnerRecord): CreateStoreResponse {
  return {
    store: {
      id: record.store_id,
      name: record.store_name,
      address: record.store_address,
      ownerId: record.store_owner_id,
      createdAt: record.store_created_at,
      updatedAt: record.store_updated_at
    },
    membership: {
      id: record.membership_id,
      storeId: record.membership_store_id,
      userId: record.membership_user_id,
      role: record.membership_role,
      joinedAt: record.membership_joined_at,
      createdAt: record.membership_created_at,
      updatedAt: record.membership_updated_at
    }
  };
}

export async function createStore(input: CreateStoreInput) {
  const record = await createStoreWithOwner(input);

  return toCreateStoreResponse(record);
}
