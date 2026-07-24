const { supabase } = require('../db/supabase');
const { ConflictError, ForbiddenError, NotFoundError } = require('../utils/errors');
const { ValidationError, requireString } = require('../utils/validators');

const ALLOWED_STATUSES = ['pending', 'confirmed', 'completed', 'rejected'];

const APPLICATION_MENTOR_SELECT = `
  mentor_id,
  status,
  applications (
    id,
    mentee_id,
    status,
    accepted_mentor_id,
    introduction,
    concern,
    goal,
    preferred_time,
    created_at,
    updated_at,
    mentee_profiles (
      school,
      major,
      grade,
      enrollment_status,
      profiles ( name )
    ),
    meetings ( id, scheduled_at, place )
  )
`;

const APPLICATION_SELECT = `
  *,
  application_mentors (
    mentor_id,
    status,
    mentor_profiles (
      school,
      major,
      academic_status,
      profiles ( name )
    )
  ),
  meetings ( id, scheduled_at, place )
`;

const MEETING_VISIBLE_STATUSES = ['confirmed', 'completed'];

const toQuestionnaire = (row) => ({
  introduction: row.introduction,
  concern: row.concern,
  goal: row.goal,
  preferredTime: row.preferred_time,
});

const toMeeting = (status, meetings) => {
  if (!MEETING_VISIBLE_STATUSES.includes(status)) return undefined;

  const meeting = Array.isArray(meetings) ? meetings[0] : meetings;
  if (!meeting) return undefined;

  return {
    id: meeting.id,
    scheduledAt: meeting.scheduled_at,
    place: meeting.place,
  };
};

const toMenteeApplicationResponse = (row) => ({
  id: row.id,
  status: row.status,
  acceptedMentorId: row.accepted_mentor_id,
  mentors: row.application_mentors.map((link) => ({
    id: link.mentor_id,
    name: link.mentor_profiles.profiles.name,
    school: link.mentor_profiles.school,
    major: link.mentor_profiles.major,
    academicStatus: link.mentor_profiles.academic_status,
  })),
  questionnaire: toQuestionnaire(row),
  meeting: toMeeting(row.status, row.meetings),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toMentorApplicationResponse = (link) => {
  const application = link.applications;

  return {
    id: application.id,
    applicationStatus: application.status,
    mentorStatus: link.status,
    acceptedMentorId: application.accepted_mentor_id,
    mentee: {
      id: application.mentee_id,
      name: application.mentee_profiles.profiles.name,
      school: application.mentee_profiles.school,
      major: application.mentee_profiles.major,
      grade: application.mentee_profiles.grade,
      enrollmentStatus: application.mentee_profiles.enrollment_status,
    },
    questionnaire: toQuestionnaire(application),
    meeting: toMeeting(application.status, application.meetings),
    createdAt: application.created_at,
    updatedAt: application.updated_at,
  };
};

const validateStatusFilter = (status) => {
  if (status && !ALLOWED_STATUSES.includes(status)) {
    throw new ValidationError('허용되지 않는 신청 상태입니다.', 'status');
  }
};

const validateMentorIds = async (mentorIds) => {
  if (!Array.isArray(mentorIds)) {
    throw new ValidationError('mentorIds는 배열이어야 합니다.', 'mentorIds');
  }

  if (mentorIds.length < 1 || mentorIds.length > 3) {
    throw new ValidationError('멘토는 1명 이상 3명 이하로 선택해야 합니다.', 'mentorIds');
  }

  if (new Set(mentorIds).size !== mentorIds.length) {
    throw new ValidationError('mentorIds에는 중복된 멘토 ID를 넣을 수 없습니다.', 'mentorIds');
  }

  const { data: mentorRows, error } = await supabase
    .from('mentor_profiles')
    .select('user_id')
    .in('user_id', mentorIds);

  if (error) throw error;

  const foundMentorIds = new Set(mentorRows.map((row) => row.user_id));
  const hasInvalidMentorId = mentorIds.some((mentorId) => !foundMentorIds.has(mentorId));

  if (hasInvalidMentorId) {
    throw new ValidationError('존재하지 않는 멘토가 포함되어 있습니다.', 'mentorIds');
  }
};

const validateQuestionnaire = (questionnaire = {}) => ({
  introduction: requireString(questionnaire.introduction, 'questionnaire.introduction'),
  concern: requireString(questionnaire.concern, 'questionnaire.concern'),
  goal: requireString(questionnaire.goal, 'questionnaire.goal'),
  preferredTime: requireString(questionnaire.preferredTime, 'questionnaire.preferredTime'),
});

const createApplication = async (menteeId, { mentorIds, questionnaire } = {}) => {
  await validateMentorIds(mentorIds);
  const validatedQuestionnaire = validateQuestionnaire(questionnaire);

  const { data: applicationRow, error } = await supabase.rpc(
    'create_application_with_mentors',
    {
      p_mentee_id: menteeId,
      p_introduction: validatedQuestionnaire.introduction,
      p_concern: validatedQuestionnaire.concern,
      p_goal: validatedQuestionnaire.goal,
      p_preferred_time: validatedQuestionnaire.preferredTime,
      p_mentor_ids: mentorIds,
    },
  );

  if (error) throw error;

  return {
    id: applicationRow.id,
    status: applicationRow.status,
    mentorIds,
    questionnaire: toQuestionnaire(applicationRow),
    createdAt: applicationRow.created_at,
  };
};

const listApplicationsForMentee = async (menteeId, status) => {
  validateStatusFilter(status);

  let query = supabase
    .from('applications')
    .select(APPLICATION_SELECT)
    .eq('mentee_id', menteeId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(toMenteeApplicationResponse);
};

const listApplicationsForMentor = async (mentorId, status) => {
  validateStatusFilter(status);

  let query = supabase
    .from('application_mentors')
    .select(APPLICATION_MENTOR_SELECT)
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(toMentorApplicationResponse);
};

const fetchApplicationRow = async (applicationId) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (error || !data) {
    throw new NotFoundError('면담 신청을 찾을 수 없습니다.');
  }

  return data;
};

const fetchMentorLink = async (applicationId, mentorId) => {
  const { data, error } = await supabase
    .from('application_mentors')
    .select('*')
    .eq('application_id', applicationId)
    .eq('mentor_id', mentorId)
    .single();

  if (error || !data) {
    throw new ForbiddenError('이 면담 신청에 대한 권한이 없습니다.');
  }

  return data;
};

const acceptApplication = async (mentorId, applicationId) => {
  const application = await fetchApplicationRow(applicationId);
  const mentorLink = await fetchMentorLink(applicationId, mentorId);

  if (application.status !== 'pending') {
    const isConfirmed = application.status === 'confirmed';
    throw new ConflictError(
      isConfirmed
        ? '이미 다른 멘토가 수락한 면담 신청입니다.'
        : '대기 상태의 면담 신청만 수락할 수 있습니다.',
      isConfirmed ? 'APPLICATION_ALREADY_CONFIRMED' : 'APPLICATION_NOT_PENDING',
    );
  }

  if (mentorLink.status !== 'pending') {
    throw new ConflictError('이미 처리한 면담 신청입니다.', 'APPLICATION_ALREADY_PROCESSED');
  }

  const now = new Date().toISOString();

  const { data: updatedApplication, error: updateAppError } = await supabase
    .from('applications')
    .update({ status: 'confirmed', accepted_mentor_id: mentorId })
    .eq('id', applicationId)
    .select('*')
    .single();

  if (updateAppError) throw updateAppError;

  const { error: updateLinkError } = await supabase
    .from('application_mentors')
    .update({ status: 'confirmed', responded_at: now })
    .eq('application_id', applicationId)
    .eq('mentor_id', mentorId);

  if (updateLinkError) throw updateLinkError;

  const { error: rejectOthersError } = await supabase
    .from('application_mentors')
    .update({ status: 'rejected', responded_at: now })
    .eq('application_id', applicationId)
    .neq('mentor_id', mentorId)
    .eq('status', 'pending');

  if (rejectOthersError) throw rejectOthersError;

  const { error: meetingError } = await supabase
    .from('meetings')
    .insert({ application_id: applicationId, mentor_id: mentorId });

  if (meetingError) throw meetingError;

  return {
    id: updatedApplication.id,
    status: updatedApplication.status,
    acceptedMentorId: updatedApplication.accepted_mentor_id,
    updatedAt: updatedApplication.updated_at,
  };
};

const rejectApplication = async (mentorId, applicationId) => {
  const application = await fetchApplicationRow(applicationId);
  const mentorLink = await fetchMentorLink(applicationId, mentorId);

  if (application.status !== 'pending' || mentorLink.status !== 'pending') {
    throw new ConflictError('이미 처리한 면담 신청입니다.', 'APPLICATION_ALREADY_PROCESSED');
  }

  const now = new Date().toISOString();

  const { data: updatedLink, error: updateLinkError } = await supabase
    .from('application_mentors')
    .update({ status: 'rejected', responded_at: now })
    .eq('application_id', applicationId)
    .eq('mentor_id', mentorId)
    .select('*')
    .single();

  if (updateLinkError) throw updateLinkError;

  const { data: allLinks, error: allLinksError } = await supabase
    .from('application_mentors')
    .select('status')
    .eq('application_id', applicationId);

  if (allLinksError) throw allLinksError;

  let applicationStatus = application.status;
  const areAllMentorsRejected = allLinks.every((link) => link.status === 'rejected');

  if (areAllMentorsRejected) {
    const { data: updatedApplication, error: updateAppError } = await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId)
      .select('*')
      .single();

    if (updateAppError) throw updateAppError;
    applicationStatus = updatedApplication.status;
  }

  return {
    id: applicationId,
    applicationStatus,
    mentorStatus: updatedLink.status,
    respondedAt: updatedLink.responded_at,
  };
};

const completeApplication = async (mentorId, applicationId) => {
  const application = await fetchApplicationRow(applicationId);

  if (application.status !== 'confirmed') {
    const isAlreadyCompleted = application.status === 'completed';
    throw new ConflictError(
      isAlreadyCompleted
        ? '이미 완료 처리된 면담 신청입니다.'
        : '확정 상태의 면담 신청만 완료 처리할 수 있습니다.',
      isAlreadyCompleted ? 'APPLICATION_ALREADY_COMPLETED' : 'APPLICATION_NOT_CONFIRMED',
    );
  }

  if (application.accepted_mentor_id !== mentorId) {
    throw new ForbiddenError('이 면담 신청을 완료 처리할 권한이 없습니다.');
  }

  const now = new Date().toISOString();

  const { data: updatedApplication, error: updateAppError } = await supabase
    .from('applications')
    .update({ status: 'completed' })
    .eq('id', applicationId)
    .select('*')
    .single();

  if (updateAppError) throw updateAppError;

  const { error: updateLinkError } = await supabase
    .from('application_mentors')
    .update({ status: 'completed' })
    .eq('application_id', applicationId)
    .eq('mentor_id', mentorId);

  if (updateLinkError) throw updateLinkError;

  const { error: updateMeetingError } = await supabase
    .from('meetings')
    .update({ completed_at: now })
    .eq('application_id', applicationId);

  if (updateMeetingError) throw updateMeetingError;

  return {
    id: updatedApplication.id,
    status: updatedApplication.status,
    acceptedMentorId: updatedApplication.accepted_mentor_id,
    updatedAt: updatedApplication.updated_at,
  };
};

module.exports = {
  acceptApplication,
  completeApplication,
  createApplication,
  fetchApplicationRow,
  listApplicationsForMentee,
  listApplicationsForMentor,
  rejectApplication,
};
