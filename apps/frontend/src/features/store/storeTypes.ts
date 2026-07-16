export type Store = {
  id: string;
  name: string;
  address: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreMembership = {
  id: string;
  storeId: string;
  userId: string;
  role: "OWNER" | "WORKER";
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoreResponse = {
  store: Store;
  membership: StoreMembership;
};
