import { apiRequest } from "./client.js"

export async function getVocabulary() {
  const { vocabulary } = await apiRequest("/api/vocabulary")
  return vocabulary
}

export async function deleteVocabularyTerms(ids) {
  return apiRequest("/api/vocabulary", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  })
}
