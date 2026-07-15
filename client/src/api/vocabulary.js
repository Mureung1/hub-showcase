import { apiRequest } from "./client.js"

export async function getVocabulary() {
  const { vocabulary } = await apiRequest("/api/vocabulary")
  return vocabulary
}
