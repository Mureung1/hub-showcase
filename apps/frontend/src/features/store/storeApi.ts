import { apiRequest } from "../../shared/api";
import { CreateStoreResponse } from "./storeTypes";

export type CreateStoreInput = {
  name: string;
  address?: string;
};

export async function createStore(accessToken: string, input: CreateStoreInput) {
  return apiRequest<CreateStoreResponse>("/stores", {
    method: "POST",
    accessToken,
    body: input
  });
}
