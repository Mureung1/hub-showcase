import httpClient from './httpClient';

export const listMessages = async ({ applicationId, cursor, limit } = {}) => {
  const params = {};
  if (cursor) params.cursor = cursor;
  if (limit) params.limit = limit;

  const response = await httpClient.get(`/applications/${applicationId}/messages`, { params });

  return response.data;
};

export const createMessage = async ({ applicationId, body }) => {
  const response = await httpClient.post(`/applications/${applicationId}/messages`, { body });

  return response.data;
};

export const markMessagesAsRead = async ({ applicationId }) => {
  const response = await httpClient.post(`/applications/${applicationId}/messages/read`);

  return response.data;
};
