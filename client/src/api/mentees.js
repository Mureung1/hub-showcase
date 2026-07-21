import httpClient from './httpClient';

export const getMyMenteeProfile = async () => {
  const response = await httpClient.get('/mentees/me');

  return response.data;
};

export const updateMyMenteeProfile = async (payload) => {
  const response = await httpClient.patch('/mentees/me', payload);

  return response.data;
};
