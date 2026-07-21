import applicationsApi from './httpClient';

const getMockAuthHeaders = (mockUserId) => ({
  'x-mock-user-id': mockUserId,
});

export const createApplication = async ({
  mentorIds,
  questionnaire,
  mockUserId,
}) => {
  const response = await applicationsApi.post(
    '/applications',
    { mentorIds, questionnaire },
    { headers: getMockAuthHeaders(mockUserId) },
  );

  return response.data;
};

export const getApplications = async ({ status, mockUserId }) => {
  const response = await applicationsApi.get('/applications', {
    headers: getMockAuthHeaders(mockUserId),
    params: status ? { status } : undefined,
  });

  return response.data;
};

export const acceptApplication = async ({ applicationId, mockUserId }) => {
  const response = await applicationsApi.patch(
    `/applications/${applicationId}/accept`,
    null,
    { headers: getMockAuthHeaders(mockUserId) },
  );

  return response.data;
};

export const rejectApplication = async ({ applicationId, mockUserId }) => {
  const response = await applicationsApi.patch(
    `/applications/${applicationId}/reject`,
    null,
    { headers: getMockAuthHeaders(mockUserId) },
  );

  return response.data;
};
