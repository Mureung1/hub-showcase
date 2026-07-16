import axios from 'axios';

const applicationsApi = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
});

applicationsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverError = error.response?.data?.error;
    const apiError = new Error(
      serverError?.message || error.message || '요청 처리 중 오류가 발생했습니다.',
    );

    apiError.code = serverError?.code;
    apiError.details = serverError?.details ?? {};
    apiError.status = error.response?.status;

    return Promise.reject(apiError);
  },
);

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
