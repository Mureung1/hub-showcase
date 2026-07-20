import { createStoreWithOwner, findStoreById, updateStore } from "./stores.repository";
import {
  CreateStoreInput,
  CreateStoreResponse,
  CreateStoreWithOwnerRecord,
  StoreRecord,
  StoreResponse,
  UpdateStoreInput
} from "./stores.types";

function toStoreResponse(store: StoreRecord): StoreResponse {
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    ownerId: store.owner_id,
    createdAt: store.created_at,
    updatedAt: store.updated_at
  };
}

function toCreateStoreResponse(record: CreateStoreWithOwnerRecord): CreateStoreResponse {
  return {
    store: toStoreResponse({
      id: record.store_id,
      name: record.store_name,
      address: record.store_address,
      owner_id: record.store_owner_id,
      created_at: record.store_created_at,
      updated_at: record.store_updated_at
    }),
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

export async function getStore(storeId: string) {
  const store = await findStoreById(storeId);

  if (!store) {
    return null;
  }

  return toStoreResponse(store);
}

export async function editStore(input: UpdateStoreInput) {
  const store = await updateStore(input);

  return toStoreResponse(store);
}
