import apiClient from './client';

export async function getAvailability(teamId, weekStart) {
  const res = await apiClient.get('/availability', {
    params: { team_id: teamId, week_start: weekStart },
  });
  return res.data;
}

export async function saveAvailability(teamId, memberId, weekStart, slots) {
  const res = await apiClient.post('/availability', {
    team_id: teamId,
    member_id: memberId,
    week_start: weekStart,
    slots,
  });
  return res.data;
}
