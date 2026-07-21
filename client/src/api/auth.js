import httpClient from './httpClient';
import { clearAccessToken, setAccessToken } from '../utils/authStorage';

export const signupMentee = async (payload) => {
  const response = await httpClient.post('/auth/signup/mentee', payload);

  return response.data;
};

export const signupMentor = async (payload) => {
  const response = await httpClient.post('/auth/signup/mentor', payload);

  return response.data;
};

export const login = async ({ email, password }) => {
  const response = await httpClient.post('/auth/login', { email, password });

  const accessToken = response.data?.data?.accessToken;
  if (accessToken) {
    setAccessToken(accessToken);
  }

  return response.data;
};

export const logout = async () => {
  try {
    await httpClient.post('/auth/logout');
  } finally {
    clearAccessToken();
  }
};

export const getCurrentUser = async () => {
  const response = await httpClient.get('/auth/me');

  return response.data;
};
