import { apiRequest } from "./client.js"

export async function getDashboardArticles() {
  const { articles } = await apiRequest("/api/dashboard")
  return articles
}
