import apiClient from './apiClient';

/**
 * Fetch group purchases with optional query filters (category, status)
 */
export const getGroupPurchases = (filters = {}) => {
  return apiClient.get('/group-purchases', { params: filters });
};

/**
 * Fetch a single group purchase details by ID
 */
export const getGroupPurchaseById = (id) => {
  return apiClient.get(`/group-purchases/${id}`);
};

/**
 * Create a new group purchase post
 */
export const createGroupPurchase = (data) => {
  return apiClient.post('/group-purchases', data);
};

/**
 * Join a group purchase post
 */
export const joinGroupPurchase = (id) => {
  return apiClient.post(`/group-purchases/${id}/join`);
};

/**
 * Cancel the current user's participation while recruitment is open.
 */
export const cancelGroupPurchaseJoin = (id) => {
  return apiClient.delete(`/group-purchases/${id}/join`);
};

/**
 * Fetch the authenticated user's profile and group-purchase activity.
 */
export const getMyGroupPurchaseActivities = () => {
  return apiClient.get('/group-purchases/mine');
};

/** Advance a hosted group purchase to its next workflow status. */
export const updateGroupPurchaseStatus = (id, status) => {
  return apiClient.patch(`/group-purchases/${id}/status`, { status });
};

/** Mark the current participant's pickup as received. */
export const markGroupPurchaseReceipt = (id) => {
  return apiClient.patch(`/group-purchases/${id}/receipt`);
};

/** Mark the current participant's bank transfer as complete. */
export const markGroupPurchasePayment = (id) => {
  return apiClient.patch(`/group-purchases/${id}/payment`);
};

/** Let the host confirm a participant's self-reported payment. */
export const confirmGroupPurchasePayment = (id, applicationId) => {
  return apiClient.patch(`/group-purchases/${id}/payments/${applicationId}/confirm`);
};

/** Fetch notifications for the signed-in user. */
export const getMyNotifications = () => apiClient.get('/notifications');
