const { supabase } = require('../db/supabase');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const { ValidationError, requireString } = require('../utils/validators');

const toApiMeeting = (row) => ({
  id: row.id,
  applicationId: row.application_id,
  mentorId: row.mentor_id,
  scheduledAt: row.scheduled_at,
  place: row.place,
  updatedAt: row.updated_at,
});

const fetchMeetingRow = async (meetingId) => {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, applications ( accepted_mentor_id )')
    .eq('id', meetingId)
    .single();

  if (error || !data) {
    throw new NotFoundError('면담 정보를 찾을 수 없습니다.');
  }

  return data;
};

const updateMeeting = async (mentorId, meetingId, payload = {}) => {
  const meeting = await fetchMeetingRow(meetingId);

  if (meeting.applications.accepted_mentor_id !== mentorId) {
    throw new ForbiddenError('이 면담 정보를 수정할 권한이 없습니다.');
  }

  const update = {};

  if (payload.scheduledAt !== undefined) {
    update.scheduled_at = requireString(payload.scheduledAt, 'scheduledAt');
  }

  if (payload.place !== undefined) {
    update.place = requireString(payload.place, 'place');
  }

  if (Object.keys(update).length === 0) {
    throw new ValidationError(
      'scheduledAt 또는 place 중 하나 이상을 전달해야 합니다.',
      'scheduledAt',
    );
  }

  const { data: updatedMeeting, error } = await supabase
    .from('meetings')
    .update(update)
    .eq('id', meetingId)
    .select('*')
    .single();

  if (error) throw error;

  return toApiMeeting(updatedMeeting);
};

module.exports = { updateMeeting };
