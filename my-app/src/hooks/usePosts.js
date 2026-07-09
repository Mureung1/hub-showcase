import { useMockResource } from "./useMockResource";
import { mockPosts } from "../api/mocks/dashboard";

export function usePosts() {
  return useMockResource(mockPosts);
}
