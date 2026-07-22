import httpClient from './httpClient';

export const createApplication = async ({ mentorIds, questionnaire }) => {
  const response = await httpClient.post('/applications', { mentorIds, questionnaire });

  return response.data;
};

export const getApplications = async ({ status } = {}) => {
  const response = await httpClient.get('/applications', {
    params: status ? { status } : undefined,
  });

  return response.data;
};

export const acceptApplication = async ({ applicationId }) => {
  const response = await httpClient.patch(`/applications/${applicationId}/accept`);

  return response.data;
};

export const rejectApplication = async ({ applicationId }) => {
  const response = await httpClient.patch(`/applications/${applicationId}/reject`);

  return response.data;
};
