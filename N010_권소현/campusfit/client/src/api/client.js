const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API 요청 실패: ${path} (${res.status})`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {getYouthPolicies: () => request("/api/youth-policy"),
  health: () => request("/api/health"),
  getCategories: () => request("/api/listings/categories"),
  getListings: (categoryId) =>
    request(`/api/listings${categoryId ? `?categoryId=${categoryId}` : ""}`),
  getBoardPosts: (listingId) =>
    request(`/api/board${listingId ? `?listingId=${listingId}` : ""}`),
  getBoardPost: (id) => request(`/api/board/${id}`),
  addBoardPost: (post) =>
    request("/api/board", {
      method: "POST",
      body: JSON.stringify(post),
    }),
  editBoardPost: (id, post, ownerToken) =>
    request(`/api/board/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...post, ownerToken }),
    }),
  deleteBoardPost: (id, ownerToken) =>
    request(`/api/board/${id}`, { method: "DELETE", body: JSON.stringify({ ownerToken }) }),
  addComment: (id, comment) =>
    request(`/api/board/${id}/comments`, {
      method: "POST",
      body: JSON.stringify(comment),
    }),
  editComment: (postId, commentId, text, ownerToken) =>
    request(`/api/board/${postId}/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ text, ownerToken }),
    }),
  deleteComment: (postId, commentId, ownerToken) =>
    request(`/api/board/${postId}/comments/${commentId}`, {
      method: "DELETE",
      body: JSON.stringify({ ownerToken }),
    }),
  closeBoardPost: (id, ownerToken) =>
    request(`/api/board/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "closed", ownerToken }),
    }),
};
