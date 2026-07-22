import httpClient from './httpClient';

export const updateMeeting = async (meetingId, payload) => {
  const response = await httpClient.patch(`/meetings/${meetingId}`, payload);

  return response.data;
};
