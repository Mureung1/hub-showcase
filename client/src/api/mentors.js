import httpClient from './httpClient';

export const getMentors = async (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => Boolean(value)),
  );

  const response = await httpClient.get('/mentors', { params });

  return response.data;
};

export const getMentorById = async (mentorId) => {
  const response = await httpClient.get(`/mentors/${mentorId}`);

  return response.data;
};

export const getMyMentorProfile = async () => {
  const response = await httpClient.get('/mentors/me');

  return response.data;
};

export const updateMyMentorProfile = async (payload) => {
  const response = await httpClient.patch('/mentors/me', payload);

  return response.data;
};
