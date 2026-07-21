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

export type StoreListItem = Store & {
  role: "OWNER" | "WORKER";
  hourlyWage: number | null;
  defaultWorkStartTime: string | null;
  defaultWorkEndTime: string | null;
  joinedAt: string;
};

export type StoreListResponse = {
  stores: StoreListItem[];
};
